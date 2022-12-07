import type { Type, StructType } from "./types.js";

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
    conform: (val) =>
      valid(val) ? { Some: val as Record<string, any> } : { None: null },
    valid,
    has: (field: string) => shape.hasOwnProperty(field),
    field: (field: string) => shape[field],
    fields: () => Object.entries(shape),
    // fields: (): [string, Type][] => Object.entries(shape),
    sub: (other): boolean => {
      if (other.__ktype__ !== "struct") {
        return false;
      }

      // to be a subtype of `other`, shape must at least have all the fields of `other`,
      // and each field must be a subtype of that same field on `other`.
      return other
        .fields()
        .every(([key]) => shape[key] && shape[key].sub(other.field(key)));
    },
    __ktype__: "struct",
  };
};

export { struct };
