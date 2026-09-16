/**
 * 問題の提示コードを本物の JDK 11 でコンパイル・実行し、
 * `expected` に書いた期待結果と一致するかを検証する。
 *
 * このプロジェクトの精度はこのスクリプトに依存している。
 * 「コンパイルが通るか」「実行結果が何か」を人間の記憶ではなく javac / java の出力で確定させる。
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { questions } from "../src/questions.ts";
import type { ExpectedResult, SilverQuestion } from "../src/quizTypes.ts";

const execFileAsync = promisify(execFile);

const WORK_DIR = ".java-work";
/** 同時に走らせる javac / java の数 */
const CONCURRENCY = 4;

type Issue = { questionId: number; rule: string; message: string };

// ---------------------------------------------------------------- JDK の検出

/** JDK 11 の bin ディレクトリを探す。SE 11 の仕様で検証するため、11 以外は使わない */
function findJdk11Bin(): string {
  const candidates: string[] = [];

  const fromEnv = process.env.JAVA11_HOME;
  if (fromEnv) candidates.push(join(fromEnv, "bin"));

  // Windows: Adoptium / Microsoft / Zulu の既定の配置を探す
  for (const base of [
    "C:/Program Files/Eclipse Adoptium",
    "C:/Program Files/Microsoft",
    "C:/Program Files/Zulu",
    "C:/Program Files/Java",
  ]) {
    if (!existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      if (/(^|[^0-9])11[._-]/.test(dir) || /jdk-?11/.test(dir)) {
        candidates.push(join(base, dir, "bin"));
      }
    }
  }

  // Linux / macOS の一般的な配置
  for (const base of ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"]) {
    if (!existsSync(base)) continue;
    for (const dir of readdirSync(base)) {
      if (/11/.test(dir)) {
        candidates.push(join(base, dir, "bin"));
        candidates.push(join(base, dir, "Contents/Home/bin"));
      }
    }
  }

  for (const bin of candidates) {
    const javac = join(bin, process.platform === "win32" ? "javac.exe" : "javac");
    if (existsSync(javac)) return bin;
  }

  throw new Error(
    "JDK 11 が見つかりません。JAVA11_HOME を設定するか、JDK 11 をインストールしてください。\n" +
      "  winget install EclipseAdoptium.Temurin.11.JDK",
  );
}

const JDK_BIN = findJdk11Bin();
const JAVAC = join(JDK_BIN, "javac");
const JAVA = join(JDK_BIN, "java");

/** javac / java のメッセージを環境ロケールに依存させない（日本語環境での文字化けも防ぐ） */
const LOCALE_FLAGS = ["-J-Duser.language=en", "-J-Duser.country=US"];

// ------------------------------------------------------------ 実行と結果取得

type RunResult =
  | { kind: "compile-error"; output: string; lines: number[] }
  | { kind: "output"; stdout: string }
  | { kind: "exception"; type: string; stderr: string };

async function compileAndRun(className: string, source: string): Promise<RunResult> {
  const dir = join(WORK_DIR, className);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${className}.java`);
  writeFileSync(file, source, "utf8");

  // --- コンパイル
  try {
    await execFileAsync(JAVAC, [...LOCALE_FLAGS, "-encoding", "UTF-8", "-d", dir, file]);
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string };
    const output = `${err.stderr ?? ""}${err.stdout ?? ""}`;
    // "Foo.java:12: error: ..." から行番号を拾う
    const lines = [...output.matchAll(/\.java:(\d+):\s*error/g)].map((m) => Number(m[1]));
    return { kind: "compile-error", output, lines };
  }

  // --- 実行
  try {
    const { stdout } = await execFileAsync(JAVA, ["-Dfile.encoding=UTF-8", "-cp", dir, className], {
      timeout: 10_000,
    });
    return { kind: "output", stdout };
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; killed?: boolean };
    const stderr = err.stderr ?? "";
    // "Exception in thread "main" java.lang.ArithmeticException: / by zero"
    const m = stderr.match(/Exception in thread "[^"]*"\s+([\w.$]+)/);
    if (m) return { kind: "exception", type: m[1]!, stderr };
    if (err.killed) {
      return { kind: "exception", type: "TIMEOUT", stderr: "10 秒以内に終了しませんでした" };
    }
    return { kind: "exception", type: "UNKNOWN", stderr };
  }
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
      if (r.kind === "exception") return `実行時例外 ${r.type}`;
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
  }

  return null;
}

/**
 * 「正解として指定した選択肢」が期待結果と噛み合っているかを見る。
 * 出力問題なら選択肢そのものが出力値になっているはずで、
 * コンパイルエラー・例外が答えならその旨が選択肢に書かれているはず。
 */
function checkChoiceConsistency(q: SilverQuestion, expected: ExpectedResult): string | null {
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
  }

  return null;
}

// ---------------------------------------------------------------------- 実行

/** 構造的な検証（コードを動かさなくても分かるもの） */
function staticChecks(q: SilverQuestion, seenIds: Set<number>): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, message: string) => issues.push({ questionId: q.id, rule, message });

  if (seenIds.has(q.id)) add("unique-id", `問題 ID ${q.id} が重複しています`);
  seenIds.add(q.id);

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
  const runsOnJdk = q.code && q.expected?.kind !== "not-verifiable";
  if (runsOnJdk && !q.className) add("class-name", "code がありますが className が未指定です");
  if (runsOnJdk && q.className) {
    const declared = q.code.join("\n").match(/public\s+(?:final\s+|abstract\s+)?class\s+(\w+)/);
    if (declared && declared[1] !== q.className) {
      add("class-name", `className "${q.className}" が public クラス "${declared[1]}" と一致しません`);
    }
  }
  if (q.code && !q.expected) {
    add("expected", "code がありますが expected が未指定です（実機検証できません）");
  }

  return issues;
}

async function main(): Promise<void> {
  console.log(`JDK: ${JDK_BIN}`);
  const { stdout: ver } = await execFileAsync(JAVA, ["-version"]).catch(
    async (e: { stderr?: string }) => ({ stdout: e.stderr ?? "" }),
  );
  console.log(ver.split("\n")[0]);

  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });

  const issues: Issue[] = [];
  const seenIds = new Set<number>();
  for (const q of questions) issues.push(...staticChecks(q, seenIds));

  const verifiable = questions.filter(
    (q) => q.code && q.className && q.expected && q.expected.kind !== "not-verifiable",
  );
  let verified = 0;

  // 並列で走らせる（javac / java は起動が重いため）
  const queue = [...verifiable];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const q = queue.shift();
      if (!q) return;

      const actual = await compileAndRun(q.className!, q.code!.join("\n"));
      const mismatch = compareResult(q.expected!, actual);
      if (mismatch) {
        issues.push({ questionId: q.id, rule: "expected-mismatch", message: mismatch });
      } else {
        verified += 1;
      }

      const inconsistent = checkChoiceConsistency(q, q.expected!);
      if (inconsistent) {
        issues.push({ questionId: q.id, rule: "choice-mismatch", message: inconsistent });
      }
    }
  });
  await Promise.all(workers);

  rmSync(WORK_DIR, { recursive: true, force: true });

  for (const issue of issues.sort((a, b) => a.questionId - b.questionId)) {
    console.log(`[ERROR] Q${issue.questionId} ${issue.rule}: ${issue.message}`);
  }

  const unverifiable = questions.length - verifiable.length;
  console.log(
    `\n検証完了: 全 ${questions.length} 問中 ${verified} 問を JDK 11 で実機検証、` +
      `${unverifiable} 問は実機検証の対象外（目視レビュー対象）、error=${issues.length}`,
  );

  if (issues.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
