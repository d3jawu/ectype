import type { Type, ArrayType } from "./types.js";
import { someOf, None } from "./util.js";

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
      if (other.__ktype__ !== "array") {
        return false;
      }

      return contains.sub(other.contains());
    },
    toString: () => `${contains}[]`,
    __ktype__: "array",
  };
};

export { array };
