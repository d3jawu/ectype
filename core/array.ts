import type { Type, ArrayType } from "./types.js";

const array = (contains: Type): ArrayType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    return val.every((entry) => contains.valid(entry));
  };

  return {
    from: (val) => val,
    conform: (val) =>
      valid(val) ? { Some: val as unknown[] } : { None: null },
    valid,
    contains: () => contains,
    sub: (other) => {
      if (other.__ktype__ !== "array") {
        return false;
      }

      return contains.sub(other.contains());
    },
    __ktype__: "array",
  };
};

export { array };
