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

  // construct the interface that all options under this variant will fulfill.
  const optionType: Record<string, Type> = Object.entries(options).reduce(
    (acc: Record<string, Type>, [k]) => {
      acc[`is${k}`] = fn([Void], Bool);

      return acc;
    },
    {}
  );

  const Option = struct(optionType);

  return {
    from: (val) => val,
    conform: (val) =>
      valid(val) ? someOf(val as { [key: string]: any }) : None,
    valid,
    has: (name) => options.hasOwnProperty(name),
    get: (name) => options[name],
    sub: (other) => {
      if (other.__ktype__ !== "variant") {
        return false;
      }

      // to be a subtype of `other`, this variant must not have components that `other` does not,
      // and each component must be a subtype of that same component on `other`.
      return Object.keys(options).every((key) => {
        other.has(key) && options[key].sub(other.get(key));
      });
    },
    match: (val) => {},
    option: () => Option,
    of: (mappedVal: Record<string, unknown>) => {
      // assume analyzer has ensured record has exactly one entry.
      const [name, val] = Object.entries(mappedVal)[0];

      // fulfill Option type.
      const members = Object.entries(options).reduce(
        (acc: Record<string, unknown>, [k, v]) => {
          acc[`is${k}`] = fn([Void], Bool).from(
            k === name ? () => true : () => false
          );

          return acc;
        },
        {}
      );

      return Option.from({
        [name]: val,
        ...members,
      });
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
