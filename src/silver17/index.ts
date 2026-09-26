import type { Silver17Question } from "../quizTypes";
import { fromSilver11Questions } from "./fromSilver11";
import { java17Questions } from "./java17";

/** Silver SE 17（1Z0-825-JPN）の全問題 */
export const silver17Questions: Silver17Question[] = [
  ...fromSilver11Questions,
  ...java17Questions,
];
