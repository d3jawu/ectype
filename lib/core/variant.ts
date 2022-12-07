import { Type, VariantType } from "./types.js";

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

export { variant };
