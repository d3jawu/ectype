// Types that only need to exist internally.

// The TypeScript type "Type" is only used internally by the analyzer.
// This also establishes the canon ordering of types, which should be followed
// anywhere multiple types are listed (except imports and exports, which are
// ordered alphabetically.)
export type Type =
  | UnknownType
  | NullType
  | BoolType
  | NumType
  | StrType
  | FnType
  | ArrayType
  | TupleType
  | StructType
  | VariantType
  | CondType
  | TypeType
  | DeferredType
  | KeywordType;
// | ErrorType;

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

export type VariantType = {
  from: (val: Record<string, unknown>) => unknown;
  conform: (val: unknown) => unknown;
  valid: (val: unknown) => boolean;
  has: (name: string) => boolean;
  get: (name: string) => Type; // Internal only
  options: () => [string, Type][];
  tags: () => string[]; // returns a list of tag names.
  sub: (other: Type) => boolean;
  eq: (other: Type) => boolean;
  toString: () => string;
  baseType: "variant";
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

/*
During analysis, "type" is the type of type-values. Getting the type of a type-value 
is not possible at runtime (and allowing that opens up a giant can of worms),
but we need a way to represent type values in the type checker.

During runtime, "type" is the abstract type representing all type-values.

TODO: This duality may be subject to change in the future.
*/
export type TypeType = {
  baseType: "type";
  from: (val: unknown) => typeof val;
  sub: (other: unknown) => boolean;
  eq: (other: Type) => boolean;
  valid: (other: unknown) => boolean;
  type: () => Type; // Gets the underlying type. Not callable at runtime.
  toString: () => string;
};

/*
Deferred is a type whose shape is unknown statically. Since no guarantees can be
made on it, it can be thought of as a bottom type, though it's not really used
in that way.

Deferred is not accessible from the runtime.
*/
export type DeferredType = {
  baseType: "deferred";
  from: (val: unknown) => never;
  conform: (val: unknown) => unknown;
  sub: (other: unknown) => false;
  eq: (other: Type) => false; // No guarantees can be made about equality.
  valid: (other: unknown) => false; // TODO: Is this actually always false?
  toString: () => string;
};

export const Deferred: DeferredType = {
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

/*
Since every variable has a type, and Ectype keywords are implemented as JS variables,
we need a special type to tag them with so they aren't accidentally treated as values
manipulable from user-space.

This isn't an actual type (it has no meaningful relationship with any other type),
it exists purely as a marker.
*/
export type KeywordType = {
  baseType: "keyword";
  from: (val: unknown) => never;
  conform: (val: unknown) => never;
  sub: (other: unknown) => false;
  eq: (other: Type) => false;
  valid: (other: unknown) => false;
  toString: () => string;
  keyword: () => string; // Returns the keyword itself.
};

export const keyword = (kw: string): KeywordType => ({
  baseType: "keyword",
  from: () => {
    throw new Error("A keyword type cannot be instantiated.");
  },
  conform: () => {
    throw new Error("A keyword type cannot be conformed.");
  },
  sub: () => {
    throw new Error("A keyword type cannot be subtyped.");
  },
  eq: () => {
    throw new Error("A keyword type cannot be compared.");
  },
  valid: () => {
    throw new Error("A keyword type cannot be conformed.");
  },
  toString: () => `Keyword(${kw})`,
  keyword: () => kw,
});

/*
ErrorType represents the type returned when a node cannot be successfully resolved 
to a type. It exists to fill locations where a type is expected so type-checking 
can continue when a type-error is not fatal.

ErrorType is deliberately missing type methods because it should not be 
compared to another type (the meaningfulness of this breaks down because it 
is not an actual type). This ideally forces eliminating the case of an ErrorType
in the control flow before doing other type handling.
*/
export type ErrorType = {
  baseType: "error";
  // Might be useful to include the message and location later.
  // message: Error;
  // location: Span;
};
