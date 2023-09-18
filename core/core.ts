"ectype:core";

export type Type =
  | UnknownType
  | DeferredType
  | NullType
  | BoolType
  | NumType
  | StrType
  | TypeType
  | ArrayType
  | CondType
  | FnType
  | StructType
  | TupleType
  | VariantType;

export type UnknownType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => true;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "unknown";
};

export type NullType = {
  from: (val: null) => null;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "null";
};

export type BoolType = {
  from: (val: boolean) => boolean;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "bool";
};

export type NumType = {
  from: (val: number) => number;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "num";
};

export type StrType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "str";
};

export type ArrayType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  contains: () => Type;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "array";
};

export type CondType = {
  from: (val: unknown) => typeof val; // Technically "never", since from cannot be used with cond.
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "cond";
};

export type FnType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  params: () => Type[];
  returns: () => Type;
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "fn";
};

export type StructType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  has: (key: string) => boolean;
  field: (key: string) => Type; // Internal only
  fields: () => [string, Type][];
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "struct";
};

export type TupleType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  field: (pos: number) => Type; // Internal only
  fields: () => Type[];
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "tuple";
};

export type VariantType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  has: (name: string) => boolean;
  get: (name: string) => Type; // Internal only
  options: () => [string, Type][];
  tags: () => string[]; // returns a list of tag names.
  of: (val: Record<string, unknown>) => unknown; // produces an option instance.
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "variant";
};

// During analysis, "type" is the type of type-values. Getting the type of a type-value is not possible at runtime,
// (and allowing that opens up a giant can of worms) but we need a way to represent type values in the type checker.
// During runtime, "type" is the abstract type representing all type-values.
export type TypeType = {
  baseType: "type";
  from: (val: unknown) => typeof val;
  sub: (other: unknown) => boolean;
  eq: (other: Type) => boolean;
  valid: (other: unknown) => boolean;
  type: () => Type; // Gets the underlying type. Not callable at runtime.
  toString: () => string;
};

// Deferred is a type whose shape is unknown statically. Since no guarantees can be made on it, it can be thought
// of as a bottom type, though it's not really used in that way.
// Deferred is not accessible from the runtime.
export type DeferredType = {
  baseType: "deferred";
  from: (val: unknown) => never;
  conform: (val: unknown) => unknown;
  sub: (other: unknown) => false;
  eq: (other: Type) => false; // No guarantees can be made about equality.
  valid: (other: unknown) => false; // TODO: Is this actually always false?
  toString: () => string;
};

const Deferred: DeferredType = {
  baseType: "deferred",
  from: () => {
    throw new Error(`DeferredType cannot be instantiated.`);
  },
  conform: () => {
    throw new Error(`DeferredType cannot be conformed.`);
  },
  sub: () => false,
  eq: () => false,
  valid: () => false,
  toString: () => "Deferred",
};

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
      ? MaybeType.of({
          Some: val,
        })
      : MaybeType.of({
          None: null,
        });
  }, // All values conform to Unknown.
  valid: (val: unknown) => true, // All values are valid instances of Unknown.
  sub: (other: Type): boolean => other.baseType === "unknown", // Only Unknown is a subtype of Unknown.
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
      ? MaybeType.of({
          Some: val,
        })
      : MaybeType.of({
          None: null,
        });
  },
  valid: (val) => val === null,
  sub: (other) => other.baseType === "null" || other.baseType === "unknown",
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
      ? MaybeType.of({
          Some: val,
        })
      : MaybeType.of({
          None: null,
        });
  },
  valid: (val) => typeof val === "boolean",
  sub: (other) =>
    other["baseType" as keyof typeof other] === "bool" ||
    other.baseType === "unknown",
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
      ? MaybeType.of({
          Some: val,
        })
      : MaybeType.of({
          None: null,
        });
  },
  valid: (val) => typeof val === "number",
  sub: (other) =>
    other["baseType" as keyof typeof other] === "num" ||
    other.baseType === "unknown",
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
      ? MaybeType.of({
          Some: val,
        })
      : MaybeType.of({
          None: null,
        });
  },
  valid: (val) => typeof val === "string",
  sub: (other) => other.baseType === "str" || other.baseType === "unknown",
  eq: (other) => other.baseType === "str",
  toString: () => "Str",
  baseType: "str",
};

// Type is the abstract type representing all type-values. Like Unknown, it cannot be instantiated directly
// and is meant to be used as a placeholder where the specific type is not known (e.g. in generic functions).
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
        ? MaybeType.of({
            Some: val,
          })
        : MaybeType.of({
            None: null,
          });
    },
    valid,
    contains: () => contains,
    eq: (other) => other.baseType === "array" && other.contains().eq(contains),
    sub: (other) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "array") {
        return false;
      }

      return contains.sub(other.contains());
    },
    toString: () => `${contains}[]`,
    baseType: "array",
  };
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
        ? MaybeType.of({
            Some: val,
          })
        : MaybeType.of({
            None: null,
          });
    },
    valid,
    sub: (other) => other.eq(type), // This type is a subtype only of the type that it wraps around.
    eq(other) {
      // Because function equality is a dubious concept to begin with, the only form of type equality supported is reference equality.
      return other === this;
    },
    toString: () => `cond(${type.toString()})`,
    baseType: "cond",
  };
};

// true if a <: b, false otherwise.
const fnParamsSub = (a: Type[], b: Type[]): boolean => {
  // Reuse tuple subtyping logic.
  const aTuple = tuple(a);
  const bTuple = tuple(b);

  return aTuple.sub(bTuple);
};

// true if a and b represent the exact same type, false otherwise.
const fnParamsEq = (a: Type[], b: Type[]): boolean => {
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
      return (
        fnParamsSub(other.params(), params) && returns.sub(other.returns())
      );
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
        ? MaybeType.of({
            Some: val,
          })
        : MaybeType.of({
            None: null,
          });
    },
    valid,
    has: (field) => shape.hasOwnProperty(field),
    field: (field) => shape[field],
    fields: () => Object.entries(shape),
    sub: (other) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "struct") {
        return false;
      }

      // To be a subtype of `other`, shape must at least have all the fields of `other`,
      // and each field must be a subtype of that same field on `other`.
      return other
        .fields()
        .every(([key]) => shape[key] && shape[key].sub(other.field(key)));
    },
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
      `struct{\n${Object.entries(shape).reduce(
        (acc, [k, v]) => `${acc}\t${k}: ${v}\n`,
        ""
      )}\n}`,
    baseType: "struct",
  };
};

const tuple = (fields: Type[]): TupleType => {
  const valid = (val: unknown) => {
    if (!Array.isArray(val)) {
      return false;
    }

    // a tuple that has more fields than this tuple is
    // stil valid as an instance of this tuple.
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
        ? MaybeType.of({
            Some: val,
          })
        : MaybeType.of({
            None: null,
          });
    },
    valid,
    field: (pos) => fields[pos],
    fields: () => fields,
    sub: (other: Type) => {
      if (other.baseType === "unknown") {
        return true;
      }

      if (other.baseType !== "tuple") {
        return false;
      }

      // to be a subtype of `other`, this must have at least all
      // fields of `other` and all types must be subtypes.
      if (fields.length < other.fields().length) {
        return false;
      }

      return other.fields().every((_, i) => fields[i].sub(other.field(i)));
    },
    eq: (other: Type) =>
      other.baseType === "tuple" &&
      other.fields().length === fields.length &&
      other.fields().every((f, i) => f.eq(fields[i])),
    toString: () => `(${fields.join(",")})`,
    baseType: "tuple",
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

      option.match = (handlers: Record<string, TypedFunction>) => {
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

const js = (behavior: () => unknown, type: Type = Null) => behavior();

export {
  Bool,
  Deferred,
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
