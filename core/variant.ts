"ectype:variant";
import { Type, VariantType } from "./types.js";
import { Void, Bool } from "./primitives.js";
import { struct } from "./struct.js";
import { fn } from "./fn.js";
import { someOf, None } from "./util.js";

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
      valid(val) ? someOf(val as { [key: string]: any }) : None,
    valid,
    has: (name) => options.hasOwnProperty(name),
    get: (name) => options[name],
    options: () => options,
    tags: () => Object.keys(options),
    sub: (other) => {
      if (other.__ktype__ !== "variant") {
        return false;
      }

      // to be a subtype of `other`, this variant must not have components that `other` does not,
      // and each component must be a subtype of that same component on `other`.
      return Object.keys(options).every(
        (key) => other.has(key) && options[key].sub(other.get(key))
      );
    },
    of: (mappedVal: Record<string, unknown>) => {
      // assume static analyzer has ensured mappedVal has exactly one entry.
      const [name, val] = Object.entries(mappedVal)[0];

      const option = Object.entries(options).reduce(
        (acc: Record<string, unknown>, [k, v]) => {
          acc[`is${k}`] = fn([Void], Bool).from(
            k === name ? () => true : () => false
          );

          return acc;
        },
        {}
      );

      // Allow read of wrapped value (assume static analyzer has checked this first).
      option[name] = val;

      option.when = (
        handlers: Record<string, (unwrappedVal: unknown) => void>
      ) => (handlers[name] || handlers["*"])(val);

      return option;
    },
    toString: () =>
      `variant{\n${Object.entries(options).reduce(
        (acc, [k, v]) => `${acc}\t${k}: ${v}\n`,
        ""
      )}\n}`,
    __ktype__: "variant",
  };
};

export { variant };
