import { Type, FnType } from "./types.js";

const fn = (param: Type, returns: Type): FnType => {
  return {
    from: (val) => val,
    conform: () => ({ None: null }), // functions cannot be conformed at runtime.
    valid: () => false, // functions cannot be validated at runtime.
    param: () => param,
    returns: () => returns,
    sub: (other) => {
      if (other.__ktype__ !== "fn") {
        return false;
      }

      // contravariant on the parameter type, covariant on the return type
      return other.param().sub(param) && returns.sub(other.returns());
    },
    __ktype__: "fn",
  };
};

export { fn };
