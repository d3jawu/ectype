import { Type as TypeType } from "../../core/primitives.js";
import { Type } from "../../core/types";

export const typeValFrom = (t: Type): Type => {
  return {
    ...TypeType,
    type: () => t,
  };
};
