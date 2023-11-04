"ectype:core";

import type {
  ArrayType,
  BoolType,
  CondType,
  FnType,
  NullType,
  NumType,
  StrType,
  StructType,
  TupleType,
  Type,
  TypeType,
  UnknownType,
  VariantType,
} from "./internal.js";

// Unknown is the top type. It is analogous to `unknown` in TypeScript.
const Unknown: UnknownType = {
  baseType: "unknown",
  from: (val) => val,
  conform(val) {
    const MaybeType = variant({
      Some: this,
      None: Null,
    });

    return this.valid(val)
      ? MaybeType.from({
          Some: val,
        })
      : MaybeType.from({
          None: null,
        });
  }, // All values conform to Unknown.
  valid: (val: unknown) => true, // All values are valid instances of Unknown.
  // sub: (other: Type): boolean => other.baseType === "unknown", // Only Unknown is a subtype of Unknown.
  eq: (other) => other.baseType === "unknown",
  toString: () => "Unknown",
};

// Null is a type that only has one value, `null`.
const Null: NullType = {
  from: (val) => val,
  conform(val) {
    const MaybeType = variant({
      Some: this,
      None: Null,
    });

    return this.valid(val)
      ? MaybeType.from({
          Some: val,
        })
      : MaybeType.from({
          None: null,
        });
  },
  valid: (val) => val === null,
  // sub: (other) => other.baseType === "null" || other.baseType === "unknown",
  eq: (other) => other.baseType === "null",
  toString: () => "Null",
  baseType: "null",
};

const Bool: BoolType = {
  from: (val) => val,
  conform(val) {
    const MaybeType = variant({
      Some: this,
      None: Null,
    });

    return this.valid(val)
      ? MaybeType.from({
          Some: val,
        })
      : MaybeType.from({
          None: null,
        });
  },
  valid: (val) => typeof val === "boolean",
  // sub: (other) =>
  //   other["baseType" as keyof typeof other] === "bool" ||
  //   other.baseType === "unknown",
  eq: (other) => other.baseType === "bool",
  toString: () => "Bool",
  baseType: "bool",
};

const Num: NumType = {
  from: (val) => val,
  conform(val) {
    const MaybeType = variant({
      Some: this,
      None: Null,
    });

    return this.valid(val)
      ? MaybeType.from({
          Some: val,
        })
      : MaybeType.from({
          None: null,
        });
  },
  valid: (val) => typeof val === "number",
  // sub: (other) =>
  //   other["baseType" as keyof typeof other] === "num" ||
  //   other.baseType === "unknown",
  eq: (other) => other.baseType === "num",
  toString: () => "Num",
  baseType: "num",
};

const Str: StrType = {
  from: (val) => val,
  conform(val) {
    const MaybeType = variant({
      Some: this,
      None: Null,
    });

    return this.valid(val)
      ? MaybeType.from({
          Some: val,
        })
      : MaybeType.from({
          None: null,
        });
  },
  valid: (val) => typeof val === "string",
  // sub: (other) => other.baseType === "str" || other.baseType === "unknown",
  eq: (other) => other.baseType === "str",
  toString: () => "Str",
  baseType: "str",
};

// true if a <: b, false otherwise.
// const fnParamsSub = (a: Type[], b: Type[]): boolean => {
//   // Reuse tuple subtyping logic.
//   const aTuple = tuple(...a);
//   const bTuple = tuple(...b);

//   // return aTuple.sub(bTuple);
// };

// true if a and b represent the exact same type, false otherwise.
const fnParamsEq = (a: Type[], b: Type[]): boolean => {
  // Reuse tuple subtyping logic.
  const aTuple = tuple(...a);
  const bTuple = tuple(...b);

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
        fnParamsEq(val.__ecparams__, params) &&
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
        ? MaybeType.from({
            Some: val,
          })
        : MaybeType.from({
            None: null,
          });
    },
    valid,
    params: () => params,
    returns: () => returns,
    // sub: (other) => {
    //   if (other.baseType === "unknown") {
    //     return true;
    //   }

    //   if (other.baseType !== "fn") {
    //     return false;
    //   }

    //   // contravariant on the parameter type, covariant on the return type
    //   return (
    //     fnParamsSub(other.params(), params) && returns.sub(other.returns())
    //   );
    // },
    eq: (other) =>
      other.baseType === "fn" &&
      other.params().length === params.length &&
      other.params().every((p, i) => p.eq(params[i])) &&
      other.returns().eq(returns),
    toString: () => `fn([${params.join(", ")}], ${returns})`,
    baseType: "fn",
  };
};

const array = (contains: Type): ArrayType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    return val.every((entry) => contains.valid(entry));
  };

  return {
    from: (val) => val,
    conform(val) {
      const MaybeType = variant({
        Some: this,
        None: Null,
      });

      return this.valid(val)
        ? MaybeType.from({
            Some: val,
          })
        : MaybeType.from({
            None: null,
          });
    },
    valid,
    contains: () => contains,
    eq: (other) => other.baseType === "array" && other.contains().eq(contains),
    // sub: (other) => {
    //   if (other.baseType === "unknown") {
    //     return true;
    //   }

    //   if (other.baseType !== "array") {
    //     return false;
    //   }

    //   return contains.sub(other.contains());
    // },
    toString: () => `array(${contains})`,
    baseType: "array",
  };
};

const tuple = (...fields: Type[]): TupleType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    // a tuple that has more fields than this tuple is still valid as an instance
    // of this tuple.
    return fields.every((_, i) => fields[i].valid(val[i as keyof typeof val]));
  };

  return {
    from: (val) => val,
    conform(val) {
      const MaybeType = variant({
        Some: this,
        None: Null,
      });

      return this.valid(val)
        ? MaybeType.from({
            Some: val,
          })
        : MaybeType.from({
            None: null,
          });
    },
    valid,
    field: (pos) => fields[pos],
    fields: () => fields,
    // sub: (other: Type) => {
    //   if (other.baseType === "unknown") {
    //     return true;
    //   }

    //   if (other.baseType !== "tuple") {
    //     return false;
    //   }

    //   // to be a subtype of `other`, this must have at least all
    //   // fields of `other` and all types must be subtypes.
    //   if (fields.length < other.fields().length) {
    //     return false;
    //   }

    //   return other.fields().every((_, i) => fields[i].sub(other.field(i)));
    // },
    eq: (other: Type) =>
      other.baseType === "tuple" &&
      other.fields().length === fields.length &&
      other.fields().every((f, i) => f.eq(fields[i])),
    toString: () => `tuple(${fields.join(", ")})`,
    baseType: "tuple",
  };
};

const struct = (shape: Record<string, Type>): StructType => {
  const valid = (val: unknown) => {
    if (typeof val !== "object" || val === null) {
      return false;
    }

    return Object.keys(shape).every((key) =>
      shape[key].valid(val[key as keyof typeof val])
    );
  };

  return {
    from: (val) => val,
    conform(val) {
      const MaybeType = variant({
        Some: this,
        None: Null,
      });

      return this.valid(val)
        ? MaybeType.from({
            Some: val,
          })
        : MaybeType.from({
            None: null,
          });
    },
    valid,
    has: (field) => shape.hasOwnProperty(field),
    field: (field) => shape[field],
    fields: () => Object.entries(shape),
    // sub: (other) => {
    //   if (other.baseType === "unknown") {
    //     return true;
    //   }

    //   if (other.baseType !== "struct") {
    //     return false;
    //   }

    //   // To be a subtype of `other`, shape must at least have all the fields of
    //   // `other`, and each field must be a subtype of that same field on `other`.
    //   return other
    //     .fields()
    //     .every(([key]) => shape[key] && shape[key].sub(other.field(key)));
    // },
    eq: (other) => {
      if (other.baseType !== "struct") {
        return false;
      }

      const otherFields = other.fields();

      if (otherFields.length !== Object.entries(shape).length) {
        return false;
      }

      return otherFields.every(([k, t]) => k in shape && shape[k].eq(t));
    },
    toString: () =>
      `struct({ ${Object.entries(shape)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")} })`,
    baseType: "struct",
  };
};

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
      // This might be allowable later, maybe if variant instances are implemented
      // as structs? But it's a can of recursive worms for now.
      throw new Error(`A variant type instance cannot be conformed.`);
    },
    valid,
    has: (name) => options.hasOwnProperty(name),
    get: (name) => options[name],
    options: () => Object.entries(options),
    tags: () => Object.keys(options),
    // sub: (other) => {
    //   if (other.baseType === "unknown") {
    //     return true;
    //   }

    //   if (other.baseType !== "variant") {
    //     return false;
    //   }

    //   // to be a subtype of `other`, this variant must not have components that
    //   // `other` does not, and each component must be a subtype of that same
    //   // component on `other`.
    //   return Object.keys(options).every(
    //     (key) => other.has(key) && options[key].sub(other.get(key))
    //   );
    // },
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
      `variant({ ${Object.entries(options)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")} })`,
    baseType: "variant",
  };
};

// Runtime matching function for variants.
variant.match = (
  incoming: Record<string, unknown>,
  handlers: {
    [key: string]:
      | ((val: unknown) => unknown)
      | [Type, (val: unknown) => unknown];
    // A little white lie to TypeScript that the wildcard is always present.
    _: (val: unknown) => unknown;
  }
): unknown => {
  /* 
  Assume that static analysis has ensured that:
  - val has exactly one key
  - the value of that key is of the correct type
  - a wildcard is present if necessary
  */
  const [tag, val] = Object.entries(incoming)[0];

  if (tag in handlers) {
    if (handlers[tag]?.constructor === Array) {
      const [assertedType, handler] = handlers[tag] as [
        Type,
        (val: unknown) => unknown
      ];

      // Do runtime type-check against asserted type.
      if (assertedType.valid(val)) {
        // Type matched assertion, run handler.
        return handler(val);
      } else {
        // Fall back to wildcard.
        return handlers._(val);
      }
    } else {
      // Type checked statically; call handler.
      return (handlers[tag] as (val: unknown) => unknown)(val);
    }
  } else {
    return handlers._(val);
  }
};

const cond = (type: Type, predicate: (val: unknown) => boolean): CondType => {
  const valid = (val: unknown): boolean => type.valid(val) && predicate(val);

  return {
    from: (val) => val,
    conform(val) {
      const MaybeType = variant({
        Some: this,
        None: Null,
      });

      return this.valid(val)
        ? MaybeType.from({
            Some: val,
          })
        : MaybeType.from({
            None: null,
          });
    },
    valid,
    // sub: (other) => other.eq(type), // This type is a subtype only of the type that it wraps around.
    eq(other) {
      // Because function equality is a dubious concept to begin with, the only
      // form of type equality supported is reference equality.
      return other === this;
    },
    toString: () => `cond(${type}, ${predicate})`,
    baseType: "cond",
  };
};

/*
Type is the abstract type representing all type-values. Like Unknown, it cannot
be instantiated directly and is meant to be used as a placeholder where the specific
type is not known (e.g. in generic functions).
*/
const typeValid = (val: unknown) =>
  typeof val === "object" && val !== null && "baseType" in val;

const Type: TypeType = {
  baseType: "type",
  from: (val) => val,
  sub: typeValid, // TODO
  valid: typeValid,
  toString: () => "Type",
  type: () => Type, // Not callable at runtime.
  eq: (other) => other.baseType === "type",
};

const js = (behavior: () => unknown, type: Type = Null) => behavior();

export {
  Bool,
  Null,
  Num,
  Str,
  Type,
  Unknown,
  array,
  cond,
  fn,
  js,
  struct,
  tuple,
  variant,
};
