import type { GoldQuestion } from "../quizTypes";
import { goldCollectionsQuestions } from "./collections";
import { goldCollectionsQuestions2 } from "./collections2";
import { goldConcurrencyQuestions } from "./concurrency";
import { goldFunctionalQuestions } from "./functional";
import { goldFunctionalQuestions2 } from "./functional2";
import { goldIoQuestions } from "./io";
import { goldJdbcQuestions } from "./jdbc";
import { goldLocalizationQuestions } from "./localization";
import { goldModulesQuestions } from "./modules";
import { goldStreamsQuestions } from "./streams";
import { goldStreamsQuestions2 } from "./streams2";

/** Gold SE 17（1Z0-826-JPN）の全問題 */
export const goldQuestions: GoldQuestion[] = [
  ...goldCollectionsQuestions,
  ...goldCollectionsQuestions2,
  ...goldFunctionalQuestions,
  ...goldFunctionalQuestions2,
  ...goldStreamsQuestions,
  ...goldStreamsQuestions2,
  ...goldModulesQuestions,
  ...goldConcurrencyQuestions,
  ...goldIoQuestions,
  ...goldJdbcQuestions,
  ...goldLocalizationQuestions,
];
