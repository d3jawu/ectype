import type { Type, VariantType, StructType, TypeType } from "./types.js";

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
    options: () => Object.entries(options),
    sub: (other) => {
      if (other.__ktype__ !== "variant") {
        return false;
      }

      // to be a subtype of `other`, this variant must not have components that `other` does not,
      // and each component must be a subtype of that same component on `other`.
      return Object.keys(options).every((key) => {
        other.has(key) && options[key].sub(other.option(key));
      });
    },
    __ktype__: "variant",
  };
};

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

// the type that describes type-values themselves.
const Type: TypeType = {
  sub: (other) => false,
  valid: (val) =>
    typeof val === "object" && val !== null && val.hasOwnProperty("__ktype__"),
  __ktype__: "type",
};

export { variant, struct };
