import { tuple } from "./tuple.js";
import { Type, FnType } from "./types.js";
import { None, someOf } from "./util.js";

// true if a <: b, false otherwise.
const paramsSub = (a: Type[], b: Type[]): boolean => {
  // Reuse tuple subtyping logic.
  const aTuple = tuple(a);
  const bTuple = tuple(b);

  return aTuple.sub(bTuple);
};

const fn = (params: Type[], returns: Type): FnType => {
  const valid = (val: unknown): boolean => {
    if (typeof val !== "function") {
      return false;
    }

    // Functions without param and return type tags are assumed to not match the fn type.
    // contravariant on the parameter type, covariant on the return type
    return Boolean(
      val.__kparams__ &&
        paramsSub(val.__kparams__, params) &&
        returns.sub(val?.__kreturns__)
    );
  };

  return {
    // Because the param and return types of a function cannot be deduced at runtime
    // we attach parameter and return types to the function value.
    from: (val) => {
      val.__kparams__ = params;
      val.__kreturns__ = returns;
      return val;
    },
    conform: (val) => (valid(val) ? someOf(val as Function) : None),
    valid,
    params: () => params,
    returns: () => returns,
    sub: (other) => {
      if (other.__ktype__ !== "fn") {
        return false;
      }

      // contravariant on the parameter type, covariant on the return type
      return paramsSub(other.params(), params) && returns.sub(other.returns());
    },
    toString: () => `fn((${params.join(",")}) => ${returns})`,
    __ktype__: "fn",
  };
};

export { fn };
