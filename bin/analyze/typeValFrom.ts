import type { Type } from "../../core/core";
import { Type as TypeType } from "../../core/core.js";

export const typeValFrom = (t: Type): Type => {
  return {
    ...TypeType,
    type: () => t,
  };
};
