import type { Silver17Question, Silver17Topic, SilverQuestion, SilverTopic } from "../quizTypes";
import { silverQuestions } from "../silver";

/**
 * Silver SE 11 の問題のうち、Silver SE 17（1Z0-825-JPN）の出題範囲にも含まれるものを流用する。
 *
 * 流用した問題も JDK 17 で改めて実機検証される（試験区分が silver17 になるため）。
 * SE 11 と SE 17 で結果が変わる問題があれば、そこで検証が落ちる。
 *
 * ID は元の ID に 20000 を足し、論点キーには "s17-" を付ける。
 * ブックマークや「前回出題した亜種」の記録を、Silver SE 11 と混ぜないため。
 */
const ID_OFFSET = 20000;

/** 分野の対応。Silver SE 17 のチェックリストに無い分野（ラムダ式、モジュール）は流用しない */
const TOPIC_MAP: Partial<Record<SilverTopic, Silver17Topic>> = {
  basics: "basics",
  datatypes: "datatypes",
  arrays: "datatypes", // 配列はチェックリストでは「基本データ型と文字列の操作」に含まれる
  operators: "control",
  control: "control",
  methods: "classes",
  inheritance: "inheritance",
  exceptions: "exceptions",
};

/**
 * 標準 API（api）の問題は、Silver SE 17 のチェックリストにある ArrayList と String、
 * 基本データ型の演算に関するものだけを流用する。
 * List.of / Arrays.asList、HashMap、Comparator、日付・時刻 API、Math、ラムダ式を使う forEach などは範囲外。
 */
const API_IN_SCOPE = new Set([
  9, 130, // List.remove のオーバーロード（ArrayList）
  311, 611, // ArrayList の add / set
  316, 616, // ArrayList の contains / indexOf と equals
  318, 618, // ArrayList の削除による添字のずれ
  312, 612, // String.split
  313, 613, // String.format
  317, 617, // int のオーバーフロー
]);

/**
 * Java のバージョンを名指しした記述を、Silver SE 17 の問題として正しい内容に置き換える。
 * [置き換え前, 置き換え後] の組で、問題文・選択肢・解説のすべてに適用する（一致しなければエラー）。
 */
const TEXT_OVERRIDES: Record<number, Array<[string, string]>> = {
  211: [["JDK 11 では false です", "JDK 17 では false です"]],
  // JDK 17 の javac は long の switch を「プレビュー機能のパターンの switch」として扱い、
  // case の行（5行目）にもエラーを出すため、誤答の「5行目」が正しくなってしまう。別の誤答に差し替える
  243: [["5行目でコンパイルエラーになる", "実行時に例外がスローされる"]],
  403: [["Java SE 11 で、次の内容を持つファイル", "Java SE 17 で、次の内容を持つファイル"]],
  412: [["本試験範囲の SE 11 では不可", "本試験範囲の SE 17 では不可"]],
  508: [["JDK 11 の既定では", "JDK 17 の既定では"]],
};

function applyOverrides(q: SilverQuestion): Pick<SilverQuestion, "question" | "choices" | "explanation"> {
  let { question, explanation } = q;
  let choices = [...q.choices];
  for (const [from, to] of TEXT_OVERRIDES[q.id] ?? []) {
    const before = [question, explanation, ...choices].join("\n");
    question = question.split(from).join(to);
    explanation = explanation.split(from).join(to);
    choices = choices.map((c) => c.split(from).join(to));
    if ([question, explanation, ...choices].join("\n") === before) {
      throw new Error(`Silver SE 11 の Q${q.id} に置き換え対象「${from}」がありません`);
    }
  }
  return { question, choices, explanation };
}

function toSilver17Topic(q: SilverQuestion): Silver17Topic | null {
  if (q.topic === "api") return API_IN_SCOPE.has(q.id) ? "datatypes" : null;
  return TOPIC_MAP[q.topic] ?? null;
}

export const fromSilver11Questions: Silver17Question[] = silverQuestions.flatMap((q) => {
  const topic = toSilver17Topic(q);
  if (!topic) return [];
  return [
    {
      ...q,
      ...applyOverrides(q),
      id: q.id + ID_OFFSET,
      topic,
      variantOf: q.variantOf ? `s17-${q.variantOf}` : undefined,
    },
  ];
});
