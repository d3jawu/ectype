import { Type as TypeType } from "../../core/type.js";
import { Type } from "../../core/types";

export const typeValFrom = (t: Type): Type => {
  if (t.baseType === "type") {
    throw new Error("A type-value cannot contain a type-value.");
  }

  return {
    ...TypeType,
    type: () => t,
  };
};
