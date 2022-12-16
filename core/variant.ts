import { Type, VariantType } from "./types.js";
import { struct } from "./struct.js";

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
    get: (name) => options[name],
    option: (name) =>
      struct({
        [name]: options[name],
      }),
    options: () => Object.entries(options),
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
    __ktype__: "variant",
  };
};

/*

Desired interface:

ifLet(myOptionVal, {
  Some: (val) => {

  }
  None: () => {

  }
}, () => {
  // else-behavior
})

*/

// Interface and implementation subject to change.
// const ifLet = (key, variantVal, handler) => {};

// Interface and implementation subject to change.
const match = (
  variant: {},
  handlers: Record<string, (val: unknown) => unknown>,
  elseHandler: () => unknown
) => {
  const [variantKey, variantVal] = Object.entries(variant)[0];

  if (handlers.hasOwnProperty(variantKey)) {
    return handlers[variantKey](variantVal);
  } else {
    return elseHandler();
  }
};

export { variant, match };
