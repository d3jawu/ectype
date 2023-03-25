"ectype:struct";
import type { Type, StructType } from "./types.js";
import { someOf, None } from "./util.js";

const struct = (shape: Record<string, Type>): StructType => {
  const valid = (val: unknown) => {
    if (typeof val !== "object" || val === null) {
      return false;
    }

    return Object.keys(shape).every((key) =>
      shape[key].valid(val[key as keyof typeof val])
    );
  };

  return {
    from: (val) => val,
    conform: (val) => (valid(val) ? someOf(val as Record<string, any>) : None),
    valid,
    has: (field) => shape.hasOwnProperty(field),
    field: (field) => shape[field],
    fields: () => Object.entries(shape),
    sub: (other) => {
      if (other.__ktype__ !== "struct") {
        return false;
      }

      // To be a subtype of `other`, shape must at least have all the fields of `other`,
      // and each field must be a subtype of that same field on `other`.
      return other
        .fields()
        .every(([key]) => shape[key] && shape[key].sub(other.field(key)));
    },
    toString: () =>
      `struct{\n${Object.entries(shape).reduce(
        (acc, [k, v]) => `${acc}\t${k}: ${v}\n`,
        ""
      )}\n}`,
    __ktype__: "struct",
  };
};

export { struct };
