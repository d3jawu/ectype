import type { Type, VariantType, StructType } from "./types.js";

const variant = (options: Record<string, Type>): VariantType => {
  const valid = (val: unknown) => {
    if (typeof val !== "object" || val === null) {
      return false;
    }

    const valKeys = Object.keys(val);

    if (valKeys.length !== 1) {
      return false;
    }

    const key = valKeys[0];

    return options[key].valid(val[key as keyof typeof val]);
  };

  return {
    from: (val) => val,
    conform: (val) =>
      valid(val) ? { Some: val as { [key: string]: any } } : { None: null },
    valid,
    // match: () => {},
    has: (name) => options.hasOwnProperty(name),
    option: (name) => options[name],
    sub: (other) => {
      if (other.kind !== "variant") {
        return false;
      }

      // to be a subtype of `other`, this variant must not have components that `other` does not,
      // and each component must be a subtype of that same component on `other`.
      return Object.keys(options).every((key) => {
        other.has(key) && options[key].sub(other.option(key));
      });
    },
    kind: "variant",
  };
};

// make a schema for a struct
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
    // fields: (): [string, Type][] => Object.entries(shape),
    sub: (other): boolean => {
      if (other.kind !== "struct") {
        return false;
      }

      // to be a subtype of `other`, shape must at least have all the fields of `other`,
      // and each field must be a subtype of that same field on `other`.
      return Object.keys(other).every((key) => {
        shape[key] && shape[key].sub(other.field(key));
      });
    },
    kind: "struct",
  };
};

export { variant, struct };
