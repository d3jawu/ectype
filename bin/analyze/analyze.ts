import type { ModuleItem } from "@swc/core/types";
import { sanitize } from "./sanitize.js";
import { typeCheck } from "./typeCheck.js";

export const analyze = (ast: ModuleItem[]) => {
  const sanitized = sanitize(ast);
  typeCheck(sanitized);
};
