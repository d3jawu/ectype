"ectype:array";
import type { ArrayType, Type } from "./types.js";
import { None, someOf } from "./util.js";

const array = (contains: Type): ArrayType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    return val.every((entry) => contains.valid(entry));
  };

  return {
    from: (val) => val,
    conform: (val) => (valid(val) ? someOf(val as unknown[]) : None),
    valid,
    contains: () => contains,
    sub: (other) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "array") {
        return false;
      }

      return contains.sub(other.contains());
    },
    toString: () => `${contains}[]`,
    baseType: "array",
  };
};

export { array };
