import type { Question } from "./quizTypes";
import { goldQuestions } from "./gold";
import { silverQuestions } from "./silver";
import { silver17Questions } from "./silver17";

export type { ExamId, ExamTopic, Question } from "./quizTypes";
export { EXAM_IDS, EXAMS, topicMeta } from "./quizTypes";

/**
 * アプリが出題する全問題。試験区分ごとのディレクトリ（src/silver/、src/silver17/、src/gold/）の問題を、
 * どの試験区分の問題かという印（exam）を付けて結合する。
 * 新しい試験区分を足すときは、ここに結合を追加する。
 */
export const questions: Question[] = [
  ...silverQuestions.map((q) => ({ ...q, exam: "silver11" as const })),
  ...silver17Questions.map((q) => ({ ...q, exam: "silver17" as const })),
  ...goldQuestions.map((q) => ({ ...q, exam: "gold17" as const })),
];
