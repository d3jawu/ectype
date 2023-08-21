"ectype:tuple";
import { Null } from "./primitives.js";
import type { TupleType, Type } from "./types.js";
import { variant } from "./variant.js";

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
    field: (pos) => fields[pos],
    fields: () => fields,
    sub: (other: Type) => {
      if (other.baseType === "unknown") {
        return true;
      }

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
    eq: (other: Type) =>
      other.baseType === "tuple" &&
      other.fields().length === fields.length &&
      other.fields().every((f, i) => f.eq(fields[i])),
    toString: () => `(${fields.join(",")})`,
    baseType: "tuple",
  };
};

export { tuple };
