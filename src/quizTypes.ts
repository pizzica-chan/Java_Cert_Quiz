/**
 * 出題範囲（Oracle Certified Java Programmer, Silver SE 11 / 1Z0-815-JPN）。
 * 公式の試験トピックおよび定番対策書の章立てに対応させている。
 * Stream API は Silver の範囲外（Gold / 1Z0-816 側）なので含めない。
 */
export type ExamTopic =
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

export const TOPIC_META: Record<ExamTopic, { label: string; description: string }> = {
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

/**
 * 提示コードを実際に javac / java にかけたときに得られるべき結果。
 * これを指定した問題は、ビルド時に `npm run verify:java` が
 * 本物の JDK 11 の出力と突き合わせて検証する（正解の裏取り）。
 */
export type ExpectedResult =
  /** 正常にコンパイル・実行され、標準出力が stdout と一致する */
  | { kind: "output"; stdout: string }
  /** コンパイルエラーになる。line を指定するとその行で出ることも確認する */
  | { kind: "compile-error"; line?: number }
  /** コンパイルは通るが、実行時に例外で終了する（type は例外の完全修飾名またはクラス名） */
  | { kind: "exception"; type: string }
  /**
   * 単一ファイルの javac / java では検証できないもの（モジュール構成など）。
   * 正しさが人間のレビュー頼りになるため、reason に検証できない理由を必ず書く。
   * 安易に使わないこと。
   */
  | { kind: "not-verifiable"; reason: string };

export interface SilverQuestion {
  id: number;
  topic: ExamTopic;
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
}
