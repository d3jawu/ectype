"ectype:variant";
import { Type, VariantType } from "./types.js";

import type { TypedFunction } from "./fn.js";

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
    conform: (val) => {
      // This might be allowable later, maybe if variant instances are implemented as structs?
      // But it's a can of recursive worms for now.
      throw new Error(`A variant type instance cannot be conformed.`);
    },
    valid,
    has: (name) => options.hasOwnProperty(name),
    get: (name) => options[name],
    options: () => Object.entries(options),
    tags: () => Object.keys(options),
    sub: (other) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "variant") {
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

      const option: Record<string, unknown> = {};

      option[name] = val;

      option.when = (handlers: Record<string, TypedFunction>) => {
        if (!handlers[name]) {
          return handlers["_"](val);
        }

        const params = handlers[name]?.__ecparams__;
        if (!params) {
          throw new Error(`Handler for ${name} was not created properly.`);
        }

        // If handler has no argument, no guarantees have been made so it's safe to call directly.
        if (params.length === 0) {
          return handlers[name](val);
        }

        const argType = params[0];

        if (argType.valid(val)) {
          return handlers[name](val);
        } else {
          return handlers["_"](val);
        }
      };

      option.toString = () => `${name}(${val})`;

      return option;
    },
    eq: (other) => {
      if (other.baseType !== "variant") {
        return false;
      }

      const otherOptions = other.options();

      if (otherOptions.length !== Object.entries(options).length) {
        return false;
      }

      return otherOptions.every(([k, t]) => k in options && options[k].eq(t));
    },
    toString: () =>
      `variant{\n${Object.entries(options).reduce(
        (acc, [k, v]) => `${acc}\t${k}: ${v}\n`,
        ""
      )}\n}`,
    baseType: "variant",
  };
};

export { variant };
