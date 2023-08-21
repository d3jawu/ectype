"ectype:struct";
import { Null } from "./primitives.js";
import type { StructType, Type } from "./types.js";
import { variant } from "./variant.js";

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
    has: (field) => shape.hasOwnProperty(field),
    field: (field) => shape[field],
    fields: () => Object.entries(shape),
    sub: (other) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "struct") {
        return false;
      }

      // To be a subtype of `other`, shape must at least have all the fields of `other`,
      // and each field must be a subtype of that same field on `other`.
      return other
        .fields()
        .every(([key]) => shape[key] && shape[key].sub(other.field(key)));
    },
    eq: (other) => {
      if (other.baseType !== "struct") {
        return false;
      }

      const otherFields = other.fields();

      if (otherFields.length !== Object.entries(shape).length) {
        return false;
      }

      return otherFields.every(([k, t]) => k in shape && shape[k].eq(t));
    },
    toString: () =>
      `struct{\n${Object.entries(shape).reduce(
        (acc, [k, v]) => `${acc}\t${k}: ${v}\n`,
        ""
      )}\n}`,
    baseType: "struct",
  };
};

export { struct };
