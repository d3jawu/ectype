import type { ModuleItem } from "@swc/core/types";
import { lower } from "./lower.js";
import { typeCheck } from "./typeCheck.js";

export const analyze = (ast: ModuleItem[]) => {
  const lowered = lower(ast);
  typeCheck(lowered);
};
