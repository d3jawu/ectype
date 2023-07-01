import { Type } from "../../core/types";

export const typeValFrom = (t: Type): Type => {
  if (t.baseType === "type") {
    throw new Error("A type-value cannot contain a type-value.");
  }

  return {
    baseType: "type",
    sub: () => false,
    valid: (other: unknown) => false,
    type: () => t,
  };
};
