/**
 * 問題の提示コードを、試験区分に対応する本物の JDK（Silver SE 11 は 11、Gold SE 17 は 17）で
 * コンパイル・実行し、`expected` に書いた期待結果と一致するかを検証する。
 *
 * このプロジェクトの精度はこのスクリプトに依存している。
 * 「コンパイルが通るか」「実行結果が何か」を人間の記憶ではなく javac / java の出力で確定させる。
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { questions as allQuestions } from "../src/questions.ts";
import { EXAMS, type ExamId } from "../src/quizTypes.ts";
import type { ExpectedResult, Library, ModuleSetup, Question, ResourceFile } from "../src/quizTypes.ts";

const WORK_DIR = resolve(".java-work");
/** ダウンロードしたライブラリ（JDBC ドライバなど）の置き場。検証のたびに取り直さないよう残しておく */
const LIB_DIR = resolve(".java-lib");
/** 同時に走らせる javac / java の数 */
const CONCURRENCY = 4;
const RUN_TIMEOUT_MS = 10_000;

type Issue = { questionId: number; rule: string; message: string };

/**
 * `--exam gold17` のように指定すると、その試験区分の問題だけを検証する（問題作成中の確認用）。
 * build と CI は指定なしで全試験区分を検証する。
 */
const examFilter = (() => {
  const i = process.argv.indexOf("--exam");
  if (i < 0) return null;
  const id = process.argv[i + 1] as ExamId | undefined;
  if (!id || !(id in EXAMS)) throw new Error(`--exam には ${Object.keys(EXAMS).join(" / ")} のいずれかを指定してください`);
  return id;
})();
const questions = examFilter ? allQuestions.filter((q) => q.exam === examFilter) : allQuestions;
/**
 * `--show` を付けると、各問の実機の結果（コンパイルエラーのメッセージや例外のメッセージ）を表示する。
 * 期待結果の種類が一致していても「解説で主張している理由でそうなっているか」は人間が確かめる必要があるため、
 * 特にモジュール構成の問題を追加・修正したときに使う。
 */
const showResults = process.argv.includes("--show");

// ------------------------------------------------------------- 外部コマンド

type ExecResult = { ok: boolean; stdout: string; stderr: string; killed: boolean };

/** 外部コマンドを実行する。標準入力には input を流して必ず閉じる（閉じないと入力待ちで止まる） */
function exec(
  command: string,
  args: string[],
  options: { cwd?: string; input?: string; timeout?: number } = {},
): Promise<ExecResult> {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd: options.cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";
    let killed = false;
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    const timer = options.timeout
      ? setTimeout(() => {
          killed = true;
          child.kill();
        }, options.timeout)
      : null;
    child.on("error", (e) => {
      if (timer) clearTimeout(timer);
      done({ ok: false, stdout, stderr: `${stderr}${e.message}`, killed });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      done({ ok: code === 0 && !killed, stdout, stderr, killed });
    });
    child.stdin.on("error", () => {
      // 入力を読まずに終了したプロセスへの書き込みエラーは無視する
    });
    child.stdin.end(options.input ?? "");
  });
}

// ---------------------------------------------------------------- JDK の検出

interface Jdk {
  version: number;
  bin: string;
  javac: string;
  java: string;
  jar: string;
  jdeps: string;
}

/** 指定したメジャーバージョンの JDK の bin ディレクトリ候補を列挙する */
function jdkBinCandidates(version: number): string[] {
  const candidates: string[] = [];

  // JAVA11_HOME / JAVA17_HOME、および actions/setup-java が設定する JAVA_HOME_17_X64 など
  for (const name of [`JAVA${version}_HOME`, `JAVA_HOME_${version}_X64`, `JAVA_HOME_${version}_ARM64`]) {
    const fromEnv = process.env[name];
    if (fromEnv) candidates.push(join(fromEnv, "bin"));
  }

  // Windows: Adoptium / Microsoft / Zulu の既定の配置を探す
  const winPattern = new RegExp(`(^|[^0-9])${version}[._-]|jdk-?${version}(?![0-9])`);
  for (const base of [
    "C:/Program Files/Eclipse Adoptium",
    "C:/Program Files/Microsoft",
    "C:/Program Files/Zulu",
    "C:/Program Files/Java",
  ]) {
    if (!existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      if (winPattern.test(dir)) candidates.push(join(base, dir, "bin"));
    }
  }

  // Linux / macOS の一般的な配置
  const unixPattern = new RegExp(`(^|[^0-9])${version}([^0-9]|$)`);
  for (const base of ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"]) {
    if (!existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      if (unixPattern.test(dir)) {
        candidates.push(join(base, dir, "bin"));
        candidates.push(join(base, dir, "Contents/Home/bin"));
      }
    }
  }

  return candidates;
}

/** `java -version` の出力からメジャーバージョンを読む（"11.0.2" → 11、"1.8.0" → 8） */
function parseMajorVersion(text: string): number | null {
  const m = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return m[1] === "1" ? Number(m[2]) : Number(m[1]);
}

/**
 * 指定したバージョンの JDK を探す。試験区分の Java バージョンの仕様で正解が決まるため、
 * 別のバージョンで代用しない（実際に `java -version` を読んで確かめる）。
 */
async function findJdk(version: number): Promise<Jdk> {
  const exe = (name: string) => (process.platform === "win32" ? `${name}.exe` : name);
  for (const bin of jdkBinCandidates(version)) {
    if (!existsSync(join(bin, exe("javac")))) continue;
    const java = join(bin, "java");
    const { stdout, stderr } = await exec(java, ["-version"]);
    if (parseMajorVersion(`${stderr}${stdout}`) !== version) continue;
    return { version, bin, javac: join(bin, "javac"), java, jar: join(bin, "jar"), jdeps: join(bin, "jdeps") };
  }
  throw new Error(
    `JDK ${version} が見つかりません。JAVA${version}_HOME を設定するか、JDK ${version} をインストールしてください。\n` +
      `  winget install EclipseAdoptium.Temurin.${version}.JDK`,
  );
}

/** javac / java のメッセージを環境ロケールに依存させない（日本語環境での文字化けも防ぐ） */
const LOCALE_FLAGS = ["-J-Duser.language=en", "-J-Duser.country=US"];

/**
 * 実行時に渡すシステムプロパティ。
 * Gold はロケール・日時のフォーマットを出題するため、既定ロケールとタイムゾーンを固定して
 * 手元（ja_JP）でも CI（en_US / UTC）でも同じ結果になるようにする。問題文もこの前提で書く。
 * Silver はロケールに依存する問題を持たないので、従来どおり環境の既定のまま動かす。
 */
const RUNTIME_PROPS: Record<ExamId, string[]> = {
  silver11: ["-Dfile.encoding=UTF-8"],
  gold17: ["-Dfile.encoding=UTF-8", "-Duser.language=ja", "-Duser.country=JP", "-Duser.timezone=Asia/Tokyo"],
};

// ------------------------------------------------------------ ライブラリ

/** 検証用ライブラリ。改ざん・取り違えを防ぐため、Maven Central 公開の SHA-1 と照合する */
const LIBRARIES: Record<Library, { fileName: string; url: string; sha1: string }> = {
  h2: {
    fileName: "h2-2.2.224.jar",
    url: "https://repo1.maven.org/maven2/com/h2database/h2/2.2.224/h2-2.2.224.jar",
    sha1: "7bdade27d8cd197d9b5ce9dc251f41d2edc5f7ad",
  },
};

const libraryPaths = new Map<Library, Promise<string>>();

function sha1(data: Buffer): string {
  return createHash("sha1").update(data).digest("hex");
}

/** ライブラリの JAR を用意する（無ければダウンロードする）。同じライブラリの取得は 1 回にまとめる */
function ensureLibrary(lib: Library): Promise<string> {
  const cached = libraryPaths.get(lib);
  if (cached) return cached;

  const task = (async () => {
    const { fileName, url, sha1: want } = LIBRARIES[lib];
    const path = join(LIB_DIR, fileName);
    if (existsSync(path) && sha1(readFileSync(path)) === want) return path;

    console.log(`ライブラリを取得しています: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} の取得に失敗しました（HTTP ${res.status}）`);
    const data = Buffer.from(await res.arrayBuffer());
    const got = sha1(data);
    if (got !== want) throw new Error(`${fileName} の SHA-1 が一致しません（期待 ${want} / 実際 ${got}）`);
    mkdirSync(LIB_DIR, { recursive: true });
    writeFileSync(path, data);
    return path;
  })();
  libraryPaths.set(lib, task);
  return task;
}

// ------------------------------------------------------------ 実行と結果取得

type RunResult =
  | { kind: "compile-error"; output: string; lines: number[] }
  | { kind: "output"; stdout: string }
  | { kind: "exception"; type: string; stderr: string; stdout: string };

/** 1 問を動かすのに必要な環境 */
interface RunContext {
  jdk: Jdk;
  /** 実行時のシステムプロパティ */
  props: string[];
  /** 追加でクラスパスに載せる JAR */
  libraries: string[];
  resources: ResourceFile[];
  stdin: string;
}

/** "Foo.java:12: error: ..." から行番号を拾う */
function compileErrorLines(output: string): number[] {
  return [...output.matchAll(/\.java:(\d+):\s*error/g)].map((m) => Number(m[1]));
}

/** 実行が失敗したときの stderr から結果を分類する */
function classifyFailure(result: ExecResult): RunResult {
  const { stderr, stdout } = result;
  // "Exception in thread "main" java.lang.ArithmeticException: / by zero"
  const m = stderr.match(/Exception in thread "[^"]*"\s+([\w.$]+)/);
  if (m) return { kind: "exception", type: m[1]!, stderr, stdout };
  if (result.killed) {
    return { kind: "exception", type: "TIMEOUT", stderr: `${RUN_TIMEOUT_MS / 1000} 秒以内に終了しませんでした`, stdout };
  }
  return { kind: "exception", type: "UNKNOWN", stderr, stdout };
}

/** 問題が前提とするファイルを作業ディレクトリに置く */
function writeResources(dir: string, resources: ResourceFile[]): void {
  for (const resource of resources) {
    const full = join(dir, resource.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, resource.content.join("\n"), "utf8");
  }
}

async function compileAndRun(
  questionId: number,
  className: string,
  source: string,
  ctx: RunContext,
): Promise<RunResult> {
  // className は問題どうしで重複しうるため、問題 ID で作業ディレクトリを分ける。
  // 分けないと、並行実行中に別の問題のソースを上書き・実行してしまう。
  // 作業ディレクトリはそのまま実行時のカレントディレクトリになり、コードが相対パスで読み書きするファイルもここに閉じる。
  const dir = join(WORK_DIR, `q${questionId}_${className}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${className}.java`);
  writeFileSync(file, source, "utf8");
  writeResources(dir, ctx.resources);

  const libCp = ctx.libraries.length > 0 ? ["-cp", ctx.libraries.join(delimiter)] : [];

  // --- コンパイル
  const compiled = await exec(ctx.jdk.javac, [...LOCALE_FLAGS, "-encoding", "UTF-8", ...libCp, "-d", dir, file]);
  if (!compiled.ok) {
    const output = `${compiled.stderr}${compiled.stdout}`;
    return { kind: "compile-error", output, lines: compileErrorLines(output) };
  }

  // --- 実行
  // package 宣言があると javac はパッケージ階層に出力するため、実行は完全修飾名で行う
  const packageName = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
  const mainClass = packageName ? `${packageName}.${className}` : className;

  const run = await exec(
    ctx.jdk.java,
    [...ctx.props, "-cp", [dir, ...ctx.libraries].join(delimiter), mainClass],
    { cwd: dir, input: ctx.stdin, timeout: RUN_TIMEOUT_MS },
  );
  if (run.ok) return { kind: "output", stdout: run.stdout };
  return classifyFailure(run);
}

/**
 * モジュール構成をそのままコンパイル・実行する。
 * 「exports していないパッケージは他モジュールから見えない」といった、
 * モジュールをまたいで初めて確かめられる挙動を実機で検証するために使う。
 */
async function compileAndRunModules(
  questionId: number,
  setup: ModuleSetup,
  ctx: RunContext,
): Promise<RunResult> {
  const base = join(WORK_DIR, `q${questionId}_modules`);
  const srcRoot = join(base, "src");
  const outRoot = join(base, "out");
  const modulePathJars = join(base, "jars", "module-path");
  const classPathJars = join(base, "jars", "class-path");
  mkdirSync(modulePathJars, { recursive: true });
  mkdirSync(classPathJars, { recursive: true });

  // --- module-info.java を持たない従来型の JAR を先に作る（自動モジュール・無名モジュールの検証用）
  const classPath: string[] = [...ctx.libraries];
  for (const [index, jar] of (setup.jars ?? []).entries()) {
    const jarSrc = join(base, "jar-src", String(index));
    const jarClasses = join(base, "jar-classes", String(index));
    const files: string[] = [];
    for (const file of jar.sources) {
      const full = join(jarSrc, file.path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, file.content.join("\n"), "utf8");
      files.push(full);
    }
    const compiled = await exec(ctx.jdk.javac, [...LOCALE_FLAGS, "-encoding", "UTF-8", "-d", jarClasses, ...files]);
    if (!compiled.ok) {
      const output = `${compiled.stderr}${compiled.stdout}`;
      return { kind: "compile-error", output, lines: compileErrorLines(output) };
    }
    const target = join(jar.placement === "module-path" ? modulePathJars : classPathJars, jar.fileName);
    const packed = await exec(ctx.jdk.jar, ["--create", "--file", target, "-C", jarClasses, "."]);
    if (!packed.ok) throw new Error(`Q${questionId}: ${jar.fileName} を作成できませんでした\n${packed.stderr}`);
    if (jar.placement === "class-path") classPath.push(target);
  }

  const moduleNames = new Set<string>();
  for (const file of setup.sources) {
    moduleNames.add(file.module);
    const full = join(srcRoot, file.module, file.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, file.content.join("\n"), "utf8");
  }
  mkdirSync(outRoot, { recursive: true });
  writeResources(base, ctx.resources);

  const cpArgs = classPath.length > 0 ? ["-cp", classPath.join(delimiter)] : [];

  // --- コンパイル（--module-source-path で複数モジュールをまとめて解決させる）
  // JAR だけを扱う問題（jdeps で JAR を解析するなど）ではモジュールのソースが無いので飛ばす
  const compiled = moduleNames.size === 0 ? { ok: true, stdout: "", stderr: "", killed: false } : await exec(ctx.jdk.javac, [
    ...LOCALE_FLAGS,
    "-encoding",
    "UTF-8",
    "--module-source-path",
    srcRoot,
    "--module-path",
    modulePathJars,
    ...cpArgs,
    "-d",
    outRoot,
    "-m",
    [...moduleNames].join(","),
  ]);
  if (!compiled.ok) {
    const output = `${compiled.stderr}${compiled.stdout}`;
    return { kind: "compile-error", output, lines: compileErrorLines(output) };
  }

  if (setup.tool) {
    const { command, args } = setup.tool;
    // jdeps / jar のメッセージも javac と同じく英語に固定する（java は問題のコードの実行なので実行時の設定に従う）
    const toolArgs = command === "java" ? [...ctx.props, ...args] : [...LOCALE_FLAGS, ...args];
    const ran = await exec(ctx.jdk[command], toolArgs, { cwd: base, input: ctx.stdin, timeout: RUN_TIMEOUT_MS });
    if (ran.ok) return { kind: "output", stdout: ran.stdout };
    return classifyFailure(ran);
  }

  if (!setup.main) {
    // 実行指定が無い場合はコンパイルが通ったことをもって成功とする
    return { kind: "output", stdout: "" };
  }

  // --- 実行
  const run = await exec(
    ctx.jdk.java,
    [...ctx.props, "--module-path", [outRoot, modulePathJars].join(delimiter), ...cpArgs, "-m", setup.main],
    { cwd: base, input: ctx.stdin, timeout: RUN_TIMEOUT_MS },
  );
  if (run.ok) return { kind: "output", stdout: run.stdout };
  return classifyFailure(run);
}

/** ソースファイルモード（javac を介さず java Foo.java で実行）で確かめる */
async function runAsSourceFile(
  questionId: number,
  className: string,
  source: string,
  ctx: RunContext,
): Promise<RunResult> {
  const dir = join(WORK_DIR, `q${questionId}_srcmode`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${className}.java`);
  writeFileSync(file, source, "utf8");
  writeResources(dir, ctx.resources);

  const libCp = ctx.libraries.length > 0 ? ["-cp", ctx.libraries.join(delimiter)] : [];
  const run = await exec(ctx.jdk.java, [...ctx.props, ...libCp, file], {
    cwd: dir,
    input: ctx.stdin,
    timeout: RUN_TIMEOUT_MS,
  });
  if (run.ok) return { kind: "output", stdout: run.stdout };

  // ソースファイルモードではコンパイルエラーも java コマンドが報告する
  if (/error:/.test(run.stderr) && !/Exception in thread/.test(run.stderr)) {
    return { kind: "compile-error", output: run.stderr, lines: compileErrorLines(run.stderr) };
  }
  return classifyFailure(run);
}

// ---------------------------------------------------------------- 照合ロジック

/** 改行コードと末尾の空白を吸収して比較する */
function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+$/, "");
}

/** 期待結果と実機の結果を突き合わせる */
function compareResult(expected: ExpectedResult, actual: RunResult): string | null {
  if (expected.kind !== actual.kind) {
    const describe = (r: RunResult): string => {
      if (r.kind === "compile-error") return `コンパイルエラー（${r.output.split("\n")[0]}）`;
      if (r.kind === "exception") return `実行時例外 ${r.type}（${r.stderr.split("\n")[0]}）`;
      return `実行成功（出力: ${JSON.stringify(normalizeOutput(r.stdout))}）`;
    };
    return `期待は "${expected.kind}" ですが、実機では ${describe(actual)} でした`;
  }

  if (expected.kind === "output" && actual.kind === "output") {
    const want = normalizeOutput(expected.stdout);
    const got = normalizeOutput(actual.stdout);
    if (want !== got) {
      return `出力が違います。期待 ${JSON.stringify(want)} / 実機 ${JSON.stringify(got)}`;
    }
  }

  if (expected.kind === "compile-error" && actual.kind === "compile-error") {
    if (expected.line !== undefined && !actual.lines.includes(expected.line)) {
      return `コンパイルエラーの行が違います。期待 ${expected.line} 行目 / 実機 ${actual.lines.join(", ")} 行目`;
    }
  }

  if (expected.kind === "exception" && actual.kind === "exception") {
    // 完全修飾名でもクラス名だけでも指定できるようにする
    const want = expected.type;
    const got = actual.type;
    if (got !== want && !got.endsWith(`.${want}`)) {
      return `例外の型が違います。期待 ${want} / 実機 ${got}`;
    }
    if (expected.stdout !== undefined) {
      const wantOut = normalizeOutput(expected.stdout);
      const gotOut = normalizeOutput(actual.stdout);
      if (wantOut !== gotOut) {
        return `例外までの出力が違います。期待 ${JSON.stringify(wantOut)} / 実機 ${JSON.stringify(gotOut)}`;
      }
    }
  }

  return null;
}

/**
 * 「正解として指定した選択肢」が期待結果と噛み合っているかを見る。
 * 出力問題なら選択肢そのものが出力値になっているはずで、
 * コンパイルエラー・例外が答えならその旨が選択肢に書かれているはず。
 */
/**
 * 「N行目でコンパイルエラーになる」という選択肢が、正誤どちらの扱いでも実機と矛盾していないかを見る。
 * 期待した行でエラーが出ていても、誤答として並べた別の行でもエラーが出ていれば、
 * その誤答も正しいことになり問題が成り立たない（expected.line の照合だけでは検出できない）。
 */
function checkCompileErrorChoices(q: Question, actual: RunResult): string | null {
  if (actual.kind !== "compile-error") return null;
  const errorLines = new Set(actual.lines);
  const wrongButTrue = q.choices.filter((choice, i) => {
    const line = choice.match(/^(\d+)行目でコンパイルエラーになる$/)?.[1];
    return line !== undefined && !q.correct.includes(i) && errorLines.has(Number(line));
  });
  if (wrongButTrue.length === 0) return null;
  return `誤答の選択肢「${wrongButTrue.join("」「")}」も実機では正しい（エラーの行: ${[...errorLines].join(", ")}）`;
}

function checkChoiceConsistency(q: Question, expected: ExpectedResult): string | null {
  if (q.correct.length !== 1) return null; // 複数選択問題はこの照合の対象外

  const choice = q.choices[q.correct[0]!];
  if (choice === undefined) return `correct が選択肢の範囲外です: ${q.correct[0]}`;

  if (expected.kind === "output") {
    const want = normalizeOutput(expected.stdout);
    const got = normalizeOutput(choice);
    if (want !== got) {
      return `正解の選択肢「${choice}」が期待出力 ${JSON.stringify(want)} と一致しません`;
    }
  }

  if (expected.kind === "compile-error" && !/コンパイル(エラー|に失敗)/.test(choice)) {
    return `期待はコンパイルエラーですが、正解の選択肢「${choice}」がそう読めません`;
  }

  if (expected.kind === "exception" && expected.type !== "TIMEOUT") {
    const simple = expected.type.split(".").pop()!;
    if (!choice.includes(simple) && !/例外|エラー/.test(choice)) {
      return `期待は例外 ${expected.type} ですが、正解の選択肢「${choice}」がそう読めません`;
    }
    // 「X と出力された後、〜がスローされる」なら、例外までの出力 X も実機と突き合わせる
    const printed = choice.match(/^(.*) と出力された後、/)?.[1];
    if (printed !== undefined && normalizeOutput(expected.stdout ?? "") !== normalizeOutput(printed)) {
      return `正解の選択肢は「${printed}」の出力を主張していますが、expected.stdout が ${JSON.stringify(expected.stdout ?? null)} です`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------- 実行

/** 構造的な検証（コードを動かさなくても分かるもの） */
function staticChecks(q: Question, seenIds: Set<number>, conceptExam: Map<string, ExamId>): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, message: string) => issues.push({ questionId: q.id, rule, message });

  if (seenIds.has(q.id)) add("unique-id", `問題 ID ${q.id} が重複しています`);
  seenIds.add(q.id);

  // 論点キーは localStorage で「前回出題した亜種」を覚えるのにも使うため、試験区分をまたいで共有させない
  if (q.variantOf) {
    const owner = conceptExam.get(q.variantOf);
    if (owner && owner !== q.exam) {
      add("variant-of", `論点キー "${q.variantOf}" が ${owner} と ${q.exam} の両方で使われています`);
    }
    conceptExam.set(q.variantOf, q.exam);
  }

  if (q.choices.length < 2) add("choices", "選択肢が 2 つ未満です");
  if (q.correct.length === 0) add("correct", "正解が指定されていません");
  if (new Set(q.correct).size !== q.correct.length) add("correct", "正解の指定が重複しています");

  for (const i of q.correct) {
    if (!Number.isInteger(i) || i < 0 || i >= q.choices.length) {
      add("correct", `正解のインデックス ${i} が選択肢の範囲外です（0〜${q.choices.length - 1}）`);
    }
  }
  if (q.correct.length === q.choices.length) add("correct", "すべての選択肢が正解になっています");

  const dup = q.choices.filter((c, i, a) => a.indexOf(c) !== i);
  if (dup.length > 0) add("choices", `選択肢が重複しています: ${[...new Set(dup)].join(" / ")}`);

  // not-verifiable な問題（module-info など）は実機で動かさないので className は不要
  const runsOnJdk = q.code && !q.moduleSetup && q.expected?.kind !== "not-verifiable";
  if (runsOnJdk && !q.className) add("class-name", "code がありますが className が未指定です");
  if (runsOnJdk && q.className) {
    const declared = q.code
      .join("\n")
      .match(/public\s+(?:final\s+|abstract\s+)?(?:class|record|interface|enum)\s+(\w+)/);
    if (declared && declared[1] !== q.className) {
      add("class-name", `className "${q.className}" が public クラス "${declared[1]}" と一致しません`);
    }
  }
  if ((q.code || q.moduleSetup) && !q.expected) {
    add("expected", "code がありますが expected が未指定です（実機検証できません）");
  }

  return issues;
}

async function main(): Promise<void> {
  // 収録している試験区分が必要とする JDK をそれぞれ探す
  const jdks = new Map<number, Jdk>();
  for (const version of new Set(questions.map((q) => EXAMS[q.exam].jdk))) {
    const jdk = await findJdk(version);
    jdks.set(version, jdk);
    const { stdout, stderr } = await exec(jdk.java, ["-version"]);
    console.log(`JDK ${version}: ${jdk.bin}`);
    console.log(`  ${`${stderr}${stdout}`.split("\n")[0]!.trim()}`);
  }

  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });

  const issues: Issue[] = [];
  const seenIds = new Set<number>();
  const conceptExam = new Map<string, ExamId>();
  for (const q of questions) issues.push(...staticChecks(q, seenIds, conceptExam));

  const verifiable = questions.filter((q) => {
    if (!q.expected || q.expected.kind === "not-verifiable") return false;
    if (q.moduleSetup) return true; // モジュール構成で検証する
    return Boolean(q.code && q.className);
  });
  const verifiedIds = new Set<number>();

  // 並列で走らせる（javac / java は起動が重いため）
  const queue = [...verifiable];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const q = queue.shift();
      if (!q) return;

      const ctx: RunContext = {
        jdk: jdks.get(EXAMS[q.exam].jdk)!,
        props: RUNTIME_PROPS[q.exam],
        libraries: await Promise.all((q.libraries ?? []).map(ensureLibrary)),
        resources: q.resources ?? [],
        stdin: q.stdin ?? "",
      };

      const actual = q.moduleSetup
        ? await compileAndRunModules(q.id, q.moduleSetup, ctx)
        : q.runAsSourceFile
          ? await runAsSourceFile(q.id, q.className!, q.code!.join("\n"), ctx)
          : await compileAndRun(q.id, q.className!, q.code!.join("\n"), ctx);
      if (showResults) {
        const detail =
          actual.kind === "compile-error"
            ? actual.output.split("\n").filter((l) => /error:/.test(l)).join("\n    ")
            : actual.kind === "exception"
              ? actual.stderr.split("\n")[0]!.trim()
              : JSON.stringify(normalizeOutput(actual.stdout));
        console.log(`[SHOW] Q${q.id} ${actual.kind}\n    ${detail}`);
      }
      const mismatch = compareResult(q.expected!, actual);
      if (mismatch) {
        issues.push({ questionId: q.id, rule: "expected-mismatch", message: mismatch });
      } else {
        verifiedIds.add(q.id);
      }

      // モジュール構成の検証は「解説の主張どおりに処理系が振る舞うか」を確かめるもので、
      // 選択肢そのものが実行結果を表しているわけではないため、突き合わせの対象外とする
      if (!q.moduleSetup && !q.runAsSourceFile) {
        const inconsistent = checkChoiceConsistency(q, q.expected!);
        if (inconsistent) {
          issues.push({ questionId: q.id, rule: "choice-mismatch", message: inconsistent });
        }
        const ambiguous = checkCompileErrorChoices(q, actual);
        if (ambiguous) {
          issues.push({ questionId: q.id, rule: "choice-ambiguous", message: ambiguous });
        }
      }
    }
  });
  await Promise.all(workers);

  rmSync(WORK_DIR, { recursive: true, force: true });

  for (const issue of issues.sort((a, b) => a.questionId - b.questionId)) {
    console.log(`[ERROR] Q${issue.questionId} ${issue.rule}: ${issue.message}`);
  }

  for (const examId of Object.keys(EXAMS) as ExamId[]) {
    const exam = EXAMS[examId];
    const examQuestions = questions.filter((q) => q.exam === examId);
    if (examQuestions.length === 0) continue;

    // 論点（variantOf）ごとの集計。出題される問題数＝論点数になる
    const concepts = new Map<string, { topic: string; variants: number }>();
    for (const q of examQuestions) {
      const key = q.variantOf ?? `__single_${q.id}`;
      const entry = concepts.get(key) ?? { topic: q.topic, variants: 0 };
      entry.variants += 1;
      concepts.set(key, entry);
    }

    const byTopic = new Map<string, { concepts: number; questions: number }>();
    for (const { topic } of concepts.values()) {
      const e = byTopic.get(topic) ?? { concepts: 0, questions: 0 };
      e.concepts += 1;
      byTopic.set(topic, e);
    }
    for (const q of examQuestions) {
      const e = byTopic.get(q.topic);
      if (e) e.questions += 1;
    }

    console.log("");
    console.log(`[${exam.name} / ${exam.code}] 分野別の論点数（括弧内は亜種を含む問題数）:`);
    for (const [topic, e] of [...byTopic.entries()].sort((a, b) => b[1].concepts - a[1].concepts)) {
      console.log(`  ${topic.padEnd(12)} ${String(e.concepts).padStart(3)} 論点 (${e.questions} 問)`);
    }
    const noVariant = [...concepts.values()].filter((c) => c.variants === 1).length;
    console.log(`合計: ${concepts.size} 論点 / ${examQuestions.length} 問（亜種が無い論点: ${noVariant}）`);

    const examVerifiable = verifiable.filter((q) => q.exam === examId);
    const verified = examVerifiable.filter((q) => verifiedIds.has(q.id)).length;
    const setupVerified = examVerifiable.filter((q) => q.moduleSetup || q.runAsSourceFile).length;
    const unverifiable = examQuestions.length - examVerifiable.length;
    console.log(
      `検証: 全 ${examQuestions.length} 問中 ${verified} 問を JDK ${exam.jdk} で実機検証` +
        `（うち ${setupVerified} 問はモジュール構成・実行方法の裏取り）、${unverifiable} 問は実機検証の対象外（目視レビュー対象）`,
    );
  }

  console.log(`\n検証完了: error=${issues.length}`);
  if (issues.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
