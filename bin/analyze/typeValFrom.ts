import { Type } from "../../core/types";

export const typeValFrom = (t: Type): Type => {
  if (t.__ktype__ === "type") {
    throw new Error("A type-value cannot contain a type-value.");
  }

  return {
    __ktype__: "type",
    sub: () => false,
    valid: (other: unknown) => false,
    type: () => t,
  };
};
