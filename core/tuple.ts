"ectype:tuple";
import type { TupleType, Type } from "./types.js";

import { None, someOf } from "./util.js";

const tuple = (fields: Type[]): TupleType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    // a tuple that has more fields than this tuple is
    // stil valid as an instance of this tuple.
    return fields.every((_, i) => fields[i].valid(val[i as keyof typeof val]));
  };

  return {
    from: (val) => val,
    conform: (val) => (valid(val) ? someOf(val as unknown[]) : None),
    valid,
    field: (pos) => fields[pos],
    fields: () => fields,
    sub: (other: Type) => {
      if (other.baseType !== "tuple") {
        return false;
      }

      // to be a subtype of `other`, this must have at least all
      // fields of `other` and all types must be subtypes.
      if (fields.length < other.fields().length) {
        return false;
      }

      return other.fields().every((_, i) => fields[i].sub(other.field(i)));
    },
    toString: () => `(${fields.join(",")})`,
    baseType: "tuple",
  };
};

export { tuple };
