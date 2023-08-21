"ectype:fn";
import { tuple } from "./tuple.js";
import { FnType, Type } from "./types.js";
import { None, someOf } from "./util.js";

// true if a <: b, false otherwise.
const paramsSub = (a: Type[], b: Type[]): boolean => {
  // Reuse tuple subtyping logic.
  const aTuple = tuple(a);
  const bTuple = tuple(b);

  return aTuple.sub(bTuple);
};

// true if a and b represent the exact same type, false otherwise.
const paramsEq = (a: Type[], b: Type[]): boolean => {
  // Reuse tuple subtyping logic.
  const aTuple = tuple(a);
  const bTuple = tuple(b);

  return aTuple.eq(bTuple);
};

type TypedFunction = {
  (): unknown;
  __kparams__: Type[];
  __kreturns__: Type;
};

const fn = (params: Type[], returns: Type): FnType => {
  const valid = (_val: unknown): boolean => {
    if (typeof _val !== "function") {
      return false;
    }

    const val = _val as TypedFunction;

    // Functions without param and return type tags are assumed to not match the fn type.
    return Boolean(
      val.__kparams__ &&
        val.__kreturns__ &&
        paramsEq(val.__kparams__, params) &&
        returns.eq(val.__kreturns__)
    );
  };

  return {
    // Because the param and return types of a function cannot be deduced at runtime
    // we attach parameter and return types to the function value.
    from: (v) => {
      const val = v as TypedFunction;
      val.__kparams__ = params;
      val.__kreturns__ = returns;
      return val;
    },
    conform: (val) => (valid(val) ? someOf(val as Function) : None),
    valid,
    params: () => params,
    returns: () => returns,
    sub: (other) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "fn") {
        return false;
      }

      // contravariant on the parameter type, covariant on the return type
      return paramsSub(other.params(), params) && returns.sub(other.returns());
    },
    eq: (other) =>
      other.baseType === "fn" &&
      other.params().length === params.length &&
      other.params().every((p, i) => p.eq(params[i])) &&
      other.returns().eq(returns),
    toString: () => `fn((${params.join(",")}) => ${returns})`,
    baseType: "fn",
  };
};

export { fn };
