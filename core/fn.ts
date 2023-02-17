import { Type, FnType } from "./types.js";

const fn = (param: Type, returns: Type): FnType => {
  const valid = (val: unknown): boolean => {
    if (typeof val !== "function") {
      return false;
    }

    // Functions without param and return type tags are assumed to not match the fn type.
    // contravariant on the parameter type, covariant on the return type
    return val?.__kparam__?.sub(param) && returns.sub(val?.__kreturns__);
  };

  return {
    // Because the param and return types of a function cannot be deduced at runtime
    // we attach parameter and return types to the function value.
    from: (val) => {
      val.__kparam__ = param;
      val.__kreturns__ = returns;
      return val;
    },
    conform: () => ({ None: null }),
    valid,
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
