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
import { variantQuestions4 } from "./variants4";
import { variantQuestions5 } from "./variants5";
import { variantQuestions6 } from "./variants6";
import { variantQuestions7 } from "./variants7";
import { variantQuestions8 } from "./variants8";

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
  ...variantQuestions4,
  ...variantQuestions5,
  ...variantQuestions6,
  ...variantQuestions7,
  ...variantQuestions8,
];
