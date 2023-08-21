"ectype:fn";
import { Null } from "./primitives.js";
import { tuple } from "./tuple.js";
import { FnType, Type } from "./types.js";
import { variant } from "./variant.js";

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

export type TypedFunction = {
  (val: unknown): unknown;
  __ecparams__: Type[];
  __ecreturns__: Type;
};

const fn = (params: Type[], returns: Type): FnType => {
  const valid = (_val: unknown): boolean => {
    if (typeof _val !== "function") {
      return false;
    }

    const val = _val as TypedFunction;

    // Functions without param and return type tags are assumed to not match the fn type.
    return Boolean(
      val.__ecparams__ &&
        val.__ecreturns__ &&
        paramsEq(val.__ecparams__, params) &&
        returns.eq(val.__ecreturns__)
    );
  };

  return {
    // Because the param and return types of a function cannot be deduced at runtime
    // we attach parameter and return types to the function value.
    from: (v) => {
      const val = v as TypedFunction;
      val.__ecparams__ = params;
      val.__ecreturns__ = returns;
      return val;
    },
    conform(val) {
      const MaybeType = variant({
        Some: this,
        None: Null,
      });

      return this.valid(val)
        ? MaybeType.of({
            Some: val,
          })
        : MaybeType.of({
            None: null,
          });
    },
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
