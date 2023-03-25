import { parseFileSync } from "@swc/core";
import { lower } from "./lower.js";
import { typeCheck } from "./typeCheck.js";

import type { Type } from "../../core/types.js";

// Parses, lowers, and type-checks a file and returns a map of its exports.
export const analyzeFile = (path: string): Record<string, Type> => {
  const { body: ast } = parseFileSync(path);
  const lowered = lower(ast);
  return typeCheck(lowered);
};
