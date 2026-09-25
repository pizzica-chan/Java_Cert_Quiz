/**
 * 収録している試験区分。
 * 試験区分ごとに Java のバージョン（＝検証に使う JDK）と出題範囲が異なる。
 */
export type ExamId = "silver11" | "gold17";

/**
 * 出題範囲（Oracle Certified Java Programmer, Silver SE 11 / 1Z0-815-JPN）。
 * 公式の試験トピックおよび定番対策書の章立てに対応させている。
 * Stream API は Silver の範囲外（Gold 側）なので含めない。
 */
export type SilverTopic =
  | "basics" // 簡単な Java プログラムの作成（main、パッケージ、import、実行）
  | "datatypes" // 基本データ型と文字列操作（型変換、String、StringBuilder）
  | "operators" // 演算子と判定構造（優先順位、if / switch）
  | "control" // 制御構造（for / while / do-while、break / continue）
  | "arrays" // 配列の操作（1次元・多次元、初期化、コピー）
  | "methods" // インスタンスとメソッド（オーバーロード、可変長引数、static、カプセル化）
  | "inheritance" // クラスの継承、インタフェース、抽象クラス（ポリモーフィズム、キャスト）
  | "lambda" // 関数型インタフェース、ラムダ式（Predicate など、基礎レベル）
  | "api" // API（List / ArrayList、日付・時刻、その他標準 API）
  | "exceptions" // 例外処理（try-catch-finally、検査例外、try-with-resources）
  | "modules"; // モジュールシステム（module-info.java、requires / exports）

/**
 * 出題範囲（Oracle Certified Java Programmer, Gold SE 17 / 1Z0-826-JPN）。
 * Oracle 公式の「試験内容チェックリスト」の 8 分野に対応させている。
 */
export type GoldTopic =
  | "collections" // コレクションとジェネリクス（オートボクシング、List / Set / Map / Deque、総称型、Comparator）
  | "functional" // 関数型インタフェースとラムダ式（内部クラス、ラムダ式、メソッド参照、java.util.function）
  | "streams" // Java ストリーム API（中間操作、リダクション、Collectors、Optional、並列ストリーム）
  | "modules" // Java モジュール・システム（宣言とアクセス、無名・自動モジュール、jdeps、ServiceLoader）
  | "concurrency" // 並列処理（Thread、ExecutorService、synchronized、並行コレクション、Flow）
  | "io" // ファイル I/O（コンソール、I/O ストリーム、シリアライズ、Path / Files、Files のストリーム）
  | "jdbc" // JDBC（DriverManager / DataSource、Statement / PreparedStatement、CallableStatement）
  | "localization"; // ローカライズ（Locale、リソース・バンドル、メッセージ・日付・数値のフォーマット）

/** 全試験区分の分野。キーは試験区分をまたいで重複しうる（例: "modules"）ので、表示名は試験区分ごとに引く */
export type ExamTopic = SilverTopic | GoldTopic;

export interface TopicMeta {
  label: string;
  description: string;
}

export const SILVER_TOPIC_META: Record<SilverTopic, TopicMeta> = {
  basics: { label: "Java プログラムの基本", description: "main メソッド、パッケージ、import、実行の流れ" },
  datatypes: { label: "データ型と文字列", description: "プリミティブ型、型変換、String / StringBuilder" },
  operators: { label: "演算子と判定構造", description: "演算子の優先順位、if 文、switch 文" },
  control: { label: "制御構造", description: "for / while / do-while、break / continue、ラベル" },
  arrays: { label: "配列", description: "1次元・多次元配列、初期化、既定値、コピー" },
  methods: { label: "メソッドとカプセル化", description: "オーバーロード、可変長引数、static、アクセス修飾子" },
  inheritance: { label: "継承・インタフェース", description: "継承、抽象クラス、インタフェース、ポリモーフィズム" },
  lambda: { label: "関数型インタフェースとラムダ式", description: "関数型インタフェースの定義とラムダ式の基礎" },
  api: { label: "標準 API", description: "List / ArrayList、日付・時刻 API など" },
  exceptions: { label: "例外処理", description: "try-catch-finally、検査例外、try-with-resources" },
  modules: { label: "モジュールシステム", description: "module-info.java、requires / exports、実行方法" },
};

export const GOLD_TOPIC_META: Record<GoldTopic, TopicMeta> = {
  collections: { label: "コレクションとジェネリクス", description: "List / Set / Map / Deque、総称型、Comparator、オートボクシング" },
  functional: { label: "関数型インタフェースとラムダ式", description: "内部クラス、ラムダ式、メソッド参照、java.util.function" },
  streams: { label: "Stream API", description: "中間操作、リダクション、Collectors、Optional、並列ストリーム" },
  modules: { label: "モジュール・システム", description: "モジュール間のアクセス、無名・自動モジュール、ServiceLoader" },
  concurrency: { label: "並列処理", description: "Thread、ExecutorService、synchronized、並行コレクション、Flow" },
  io: { label: "ファイル I/O", description: "コンソール、I/O ストリーム、シリアライズ、Path / Files" },
  jdbc: { label: "JDBC", description: "DriverManager、Statement / PreparedStatement、CallableStatement" },
  localization: { label: "ローカライズ", description: "Locale、リソース・バンドル、メッセージ・日付・数値のフォーマット" },
};

export interface ExamMeta<T extends ExamTopic = ExamTopic> {
  id: ExamId;
  /** 画面に出す短い名前（例: "Silver SE 11"） */
  name: string;
  /** 試験番号（例: "1Z0-815-JPN"） */
  code: string;
  /** 正解の裏取りに使う JDK のメジャーバージョン */
  jdk: number;
  /** 本試験の出題数 */
  questionCount: number;
  /** 本試験の制限時間（分） */
  minutes: number;
  /** 合格ライン */
  passingRate: number;
  /** 分野（表示順） */
  topics: Record<T, TopicMeta>;
}

/** 試験区分ごとの設定。本試験の形式（出題数・時間・合格ライン）は Oracle 公式の試験詳細に合わせる */
export const EXAMS: { silver11: ExamMeta<SilverTopic>; gold17: ExamMeta<GoldTopic> } = {
  silver11: {
    id: "silver11",
    name: "Silver SE 11",
    code: "1Z0-815-JPN",
    jdk: 11,
    questionCount: 80,
    minutes: 180,
    passingRate: 0.63,
    topics: SILVER_TOPIC_META,
  },
  gold17: {
    id: "gold17",
    name: "Gold SE 17",
    code: "1Z0-826-JPN",
    jdk: 17,
    questionCount: 60,
    minutes: 90,
    passingRate: 0.65,
    topics: GOLD_TOPIC_META,
  },
};

export const EXAM_IDS = Object.keys(EXAMS) as ExamId[];

/** 試験区分の中での分野の表示情報を引く */
export function topicMeta(exam: ExamId, topic: ExamTopic): TopicMeta {
  const topics = EXAMS[exam].topics as Partial<Record<ExamTopic, TopicMeta>>;
  return topics[topic] ?? { label: topic, description: "" };
}

/**
 * 提示コードを実際に javac / java にかけたときに得られるべき結果。
 * これを指定した問題は、ビルド時に `npm run verify:java` が
 * 試験区分に対応する本物の JDK（Silver SE 11 なら 11、Gold SE 17 なら 17）の出力と突き合わせて検証する（正解の裏取り）。
 */
export type ExpectedResult =
  /** 正常にコンパイル・実行され、標準出力が stdout と一致する */
  | { kind: "output"; stdout: string }
  /** コンパイルエラーになる。line を指定するとその行で出ることも確認する */
  | { kind: "compile-error"; line?: number }
  /**
   * コンパイルは通るが、実行時に例外で終了する（type は例外の完全修飾名またはクラス名）。
   * stdout を指定すると、例外で終了するまでに出力された内容も確認する
   * （「〜と出力された後、例外がスローされる」という選択肢の裏取り）。
   */
  | { kind: "exception"; type: string; stdout?: string }
  /**
   * 単一ファイルの javac / java では検証できないもの（モジュール構成など）。
   * 正しさが人間のレビュー頼りになるため、reason に検証できない理由を必ず書く。
   * 安易に使わないこと。
   */
  | { kind: "not-verifiable"; reason: string };

/**
 * 複数ファイル（モジュール構成）を伴う検証のためのソース一式。
 * 単一ファイルの `code` では表現できない「モジュールをまたぐ公開範囲」などを
 * 実際に javac / java へかけて確かめるために使う。
 */
export interface ModuleSetup {
  /**
   * 実行するエントリーポイント。"モジュール名/メインクラスの完全修飾名" の形式。
   * 省略するとコンパイルのみ行う（コンパイルエラーの検証で使う）。
   */
  main?: string;
  /** モジュールごとのソースファイル */
  sources: Array<{
    /** モジュール名。そのままソースディレクトリ名になる */
    module: string;
    /** モジュール内の相対パス（例: "module-info.java" や "com/example/api/Service.java"） */
    path: string;
    content: string[];
  }>;
  /**
   * module-info.java を持たない従来型の JAR。先に通常の javac でコンパイルして JAR にまとめ、
   * placement に応じてモジュールパス（＝自動モジュール）かクラスパス（＝無名モジュール）に置く。
   * 「JAR ファイル名から自動モジュール名が決まる」「名前付きモジュールは無名モジュールを読めない」
   * といった挙動を実機で確かめるために使う。
   */
  jars?: Array<{
    /** JAR ファイル名（例: "legacy-util-1.0.jar"）。自動モジュール名の導出元になる */
    fileName: string;
    placement: "module-path" | "class-path";
    sources: Array<{ path: string; content: string[] }>;
  }>;
  /**
   * 構成をビルドしたあと、main の代わりに JDK のコマンド（jdeps / jar / java）を実行し、その標準出力を結果とする。
   * jdeps の出力やコマンドラインオプションの振る舞いを実機で確かめるために使う。
   * カレントディレクトリは構成のルートで、引数からは次の場所を相対パスで参照できる:
   *   out/（モジュールのコンパイル結果、モジュールごとのディレクトリ）、
   *   jars/module-path/・jars/class-path/（jars で作った JAR）
   */
  tool?: { command: "jdeps" | "jar" | "java"; args: string[] };
}

/** 問題が前提とするコード以外のファイル（プロパティファイル、入力ファイルなど） */
export interface ResourceFile {
  /** カレントディレクトリからの相対パス（例: "Messages_ja.properties", "data.txt"） */
  path: string;
  content: string[];
}

/** 検証時に追加でクラスパスに載せるライブラリ（JDBC ドライバなど） */
export type Library = "h2";

export interface QuestionData<T extends ExamTopic> {
  id: number;
  topic: T;
  /**
   * 同じ論点の亜種をまとめるキー（例: "datatypes-compound-assign"）。
   * 同じキーを持つ問題は「同じ論点を別の切り口・別の値で問うたもの」とみなし、
   * 出題時はその中から 1 問だけがランダムに選ばれる。
   * 繰り返し解いたときに答えそのものを丸暗記できないようにするための仕組み。
   */
  variantOf?: string;
  /** 問題文。本試験に倣い「結果はどれか」「正しい記述はどれか」などの問い方にする */
  question: string;
  /** 提示コード（1行1要素）。省略時は文章だけの問題 */
  code?: string[];
  /**
   * code を検証用 .java として書き出すときのファイル名に使う public クラス名。
   * code を持つ問題では必須。
   */
  className?: string;
  /** 選択肢。本試験に倣い 4〜6 個程度 */
  choices: string[];
  /** 正解の選択肢インデックス（0 始まり）。要素が 2 つ以上なら複数選択問題 */
  correct: number[];
  /** 解説。なぜその答えになるかを、仕様に基づいて説明する */
  explanation: string;
  /**
   * 実機検証の期待結果。コードを持つ問題には原則として指定する。
   * 指定がない問題は機械検証できないため、内容の正しさは人間のレビューに依存する。
   */
  expected?: ExpectedResult;
  /**
   * モジュール構成での検証。指定すると `code` ではなくこちらを
   * --module-source-path でコンパイル・実行して expected と突き合わせる。
   * `code` を省略した場合は、このソース一式をそのまま画面に表示する。
   */
  moduleSetup?: ModuleSetup;
  /**
   * Java のソースファイルモード（javac を介さず `java Foo.java` で実行）で
   * 検証する場合に true。`code` をそのまま java コマンドへ渡す。
   */
  runAsSourceFile?: boolean;
  /**
   * コードが読み書きするファイル。検証時はカレントディレクトリ（クラスパスも兼ねる）に置き、
   * 画面にもコードと並べて表示する。リソース・バンドルや入力ファイルの前提を示すために使う。
   */
  resources?: ResourceFile[];
  /** 実行時に標準入力へ流し込む内容（コンソール入力を扱う問題用） */
  stdin?: string;
  /** 検証時にクラスパスへ追加するライブラリ（JDBC の問題では "h2" を指定する） */
  libraries?: Library[];
}

/** Silver SE 11 の問題データ */
export type SilverQuestion = QuestionData<SilverTopic>;
/** Gold SE 17 の問題データ */
export type GoldQuestion = QuestionData<GoldTopic>;

/** アプリが扱う問題。どの試験区分の問題かを exam で持つ（src/questions.ts で付与する） */
export type Question =
  | (SilverQuestion & { exam: "silver11" })
  | (GoldQuestion & { exam: "gold17" });
