import type { GoldQuestion } from "../quizTypes";
import { goldCollectionsQuestions } from "./collections";
import { goldConcurrencyQuestions } from "./concurrency";
import { goldFunctionalQuestions } from "./functional";
import { goldIoQuestions } from "./io";
import { goldJdbcQuestions } from "./jdbc";
import { goldLocalizationQuestions } from "./localization";
import { goldModulesQuestions } from "./modules";
import { goldStreamsQuestions } from "./streams";

/** Gold SE 17（1Z0-826-JPN）の全問題 */
export const goldQuestions: GoldQuestion[] = [
  ...goldCollectionsQuestions,
  ...goldFunctionalQuestions,
  ...goldStreamsQuestions,
  ...goldModulesQuestions,
  ...goldConcurrencyQuestions,
  ...goldIoQuestions,
  ...goldJdbcQuestions,
  ...goldLocalizationQuestions,
];
