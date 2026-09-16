import type { SilverQuestion } from "./quizTypes";
import { silverQuestions } from "./silver";

export type { ExamTopic, SilverQuestion } from "./quizTypes";
export { TOPIC_META } from "./quizTypes";

/**
 * アプリが出題する全問題。
 * 現時点は Silver SE 11 のみ。Gold を追加する際は
 * src/gold/ を作り、ここで結合する。
 */
export const questions: SilverQuestion[] = [...silverQuestions];
