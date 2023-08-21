"ectype:array";
import { Null } from "./primitives.js";
import type { ArrayType, Type } from "./types.js";
import { variant } from "./variant.js";

const array = (contains: Type): ArrayType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    return val.every((entry) => contains.valid(entry));
  };

  return {
    from: (val) => val,
    conform(val) {
      const MaybeType = variant({
        Some: this,
        None: Null,
      });

      return this.valid(val)
        ? MaybeType.of({
            Some: val,
          })
        : MaybeType.of({
            None: null,
          });
    },
    valid,
    contains: () => contains,
    eq: (other) => other.baseType === "array" && other.contains().eq(contains),
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
