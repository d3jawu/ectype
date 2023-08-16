"ectype:types";
export type Option<T> =
  | {
      Some: T;
      isSome: () => true;
      isNone: () => false;
      when: (
        handlers: Record<string, (unwrapped?: unknown) => unknown>
      ) => unknown;
    }
  | {
      None: undefined;
      isSome: () => false;
      isNone: () => true;
      when: (
        handlers: Record<string, (unwrapped?: unknown) => unknown>
      ) => unknown;
    };

export type Type =
  | UnknownType
  | NullType
  | BoolType
  | NumType
  | StrType
  | FnType
  | TupleType
  | ArrayType
  | VariantType
  | StructType
  | DeferredType
  | TypeType;

// `from` is a passthrough function used to signal to the type-checker
// that the value being passed in is expected to verifiably fulfill
// the type at compile-time.

// `conform` is a function that receives any value and returns an Option
// containing the value if it is valid (see `valid` below), or None if not.

// `valid` receives any value and returns true if it is a valid instance of
// the type, false otherwise.

// `sub` returns true if the type is a subtype of `other` - that is, values of
// the type can be safely substituted in anywhere a value of `other` is present.

export type UnknownType = {
  from: (val: unknown) => unknown;
  conform: (val: unknown) => Option<unknown>;
  valid: (val: unknown) => true;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "unknown";
};

export type NullType = {
  from: (val: null) => null;
  conform: (val: unknown) => Option<null>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "null";
};

export type BoolType = {
  from: (val: boolean) => boolean;
  conform: (val: unknown) => Option<boolean>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "bool";
};

export type NumType = {
  from: (val: number) => number;
  conform: (val: unknown) => Option<number>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "num";
};

export type StrType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<string>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "str";
};

export type FnType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<Function>;
  valid: (val: unknown) => boolean;
  params: () => Type[];
  returns: () => Type;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "fn";
};

export type VariantType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<{ [key: string]: any }>;
  valid: (val: unknown) => boolean;
  has: (name: string) => boolean;
  get: (name: string) => Type; // gets the type held in that option. name TBD
  options: () => Record<string, Type>;
  tags: () => string[]; // returns a list of tag names.
  of: (val: Record<string, unknown>) => unknown; // produces an option instance.
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "variant";
};

export type TupleType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<unknown[]>;
  valid: (val: unknown) => boolean;
  field: (pos: number) => Type; // gets the type held at that position in the tuple.
  fields: () => Type[];
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "tuple";
};

export type ArrayType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<unknown[]>;
  valid: (val: unknown) => boolean;
  contains: () => Type;
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "array";
};

export type StructType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<Record<string, any>>;
  valid: (val: unknown) => boolean;
  has: (key: string) => boolean;
  field: (key: string) => Type;
  fields: () => [string, Type][];
  sub: (other: Type) => boolean;
  toString: () => string;
  baseType: "struct";
};

// The following types do not appear at runtime, but are used during type-checking.
// Because this entire file compiles away to an empty file, there is no overhead for these.

// "deferred" is the type given to values whose type cannot be determined statically.
export type DeferredType = {
  baseType: "deferred";
  sub: () => false;
  valid: (other: unknown) => boolean;
};

// During analysis, "type" is the type of type-values. Getting the type of a type-value is not possible at runtime,
// (and allowing that opens up a giant can of worms) but we need a way to represent type values in the type checker.
// During runtime, "type" is the abstract type representing all type-values. See the implementation (type.ts).
export type TypeType = {
  baseType: "type";
  sub: (other: unknown) => boolean;
  valid: (other: unknown) => boolean;
  type: () => Type; // Gets the underlying type. Not callable at runtime.
  toString: () => string;
};
