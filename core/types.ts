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
  | VoidType
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

export type VoidType = {
  from: (val: null) => never;
  conform: (val: unknown) => never;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "void";
};

export type NullType = {
  from: (val: null) => null;
  conform: (val: unknown) => Option<null>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "null";
};

export type BoolType = {
  from: (val: boolean) => boolean;
  conform: (val: unknown) => Option<boolean>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "bool";
};

export type NumType = {
  from: (val: number) => number;
  conform: (val: unknown) => Option<number>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "num";
};

export type StrType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<string>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "str";
};

export type FnType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<Function>;
  valid: (val: unknown) => boolean;
  params: () => Type[];
  returns: () => Type;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "fn";
};

export type VariantType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<{ [key: string]: any }>;
  valid: (val: unknown) => boolean;
  has: (name: string) => boolean;
  get: (name: string) => Type; // gets the type held in that option. name TBD
  of: (val: Record<string, unknown>) => unknown;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "variant";
};

export type TupleType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<unknown[]>;
  valid: (val: unknown) => boolean;
  field: (pos: number) => Type; // gets the type held at that position in the tuple.
  fields: () => Type[];
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "tuple";
};

export type ArrayType = {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<unknown[]>;
  valid: (val: unknown) => boolean;
  contains: () => Type;
  sub: (other: Type) => boolean;
  toString: () => string;
  __ktype__: "array";
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
  __ktype__: "struct";
};

// The following types do not appear at runtime, but are used during type-checking.
// Because this entire file compiles away to an empty file, there is no overhead for these.

// "deferred" is the type given to values whose type cannot be determined statically.
export type DeferredType = {
  __ktype__: "deferred";
  sub: () => false;
  valid: (other: unknown) => boolean;
};

// "type" is the type of type-values. Getting the type of a type-value is not possible at runtime,
// (and allowing that opens up a giant can of worms) but we need a way to represent type values in the type checker.
export type TypeType = {
  __ktype__: "type";
  sub: () => boolean;
  valid: (other: unknown) => boolean;
  type: () => Type;
};
