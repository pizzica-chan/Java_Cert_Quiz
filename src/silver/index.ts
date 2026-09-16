import type { SilverQuestion } from "../quizTypes";
import { coreQuestions } from "./core";
import { moreQuestions } from "./more";
import { variantQuestions } from "./variants";
import { variantQuestions2 } from "./variants2";
import { extraQuestions1 } from "./extra1";
import { extraQuestions2 } from "./extra2";
import { extraQuestions3 } from "./extra3";
import { extraQuestions4 } from "./extra4";
import { extraQuestions5 } from "./extra5";
import { extraQuestions6 } from "./extra6";
import { extraQuestions7 } from "./extra7";
import { variantQuestions3 } from "./variants3";

/** Silver SE 11（1Z0-815）の全問題 */
export const silverQuestions: SilverQuestion[] = [
  ...coreQuestions,
  ...moreQuestions,
  ...variantQuestions,
  ...variantQuestions2,
  ...extraQuestions1,
  ...extraQuestions2,
  ...extraQuestions3,
  ...extraQuestions4,
  ...extraQuestions5,
  ...extraQuestions6,
  ...extraQuestions7,
  ...variantQuestions3,
];
