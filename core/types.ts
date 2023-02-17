export type Option<T> =
  | {
      Some: T;
      isSome: () => true;
      isNone: () => false;
    }
  | {
      None: undefined;
      isSome: () => false;
      isNone: () => true;
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

export interface VoidType {
  from: (val: null) => never;
  conform: (val: unknown) => never;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "void";
}

export interface NullType {
  from: (val: null) => null;
  conform: (val: unknown) => Option<null>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "null";
}

export interface BoolType {
  from: (val: boolean) => boolean;
  conform: (val: unknown) => Option<boolean>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "bool";
}

export interface NumType {
  from: (val: number) => number;
  conform: (val: unknown) => Option<number>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "num";
}

export interface StrType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<string>;
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "str";
}

export interface FnType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<Function>;
  valid: (val: unknown) => boolean;
  param: () => Type;
  returns: () => Type;
  sub: (other: Type) => boolean;
  __ktype__: "fn";
}

export interface VariantType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<{ [key: string]: any }>;
  valid: (val: unknown) => boolean;
  has: (name: string) => boolean;
  get: (name: string) => Type; // gets the type held in that option. name TBD
  match: (val: unknown) => unknown;
  of: (val: Record<string, unknown>) => unknown;
  sub: (other: Type) => boolean;
  Option: Type;
  __ktype__: "variant";
}

export interface TupleType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<unknown[]>;
  valid: (val: unknown) => boolean;
  field: (pos: number) => Type; // gets the type held at that position in the tuple.
  fields: () => Type[];
  sub: (other: Type) => boolean;
  __ktype__: "tuple";
}

export interface ArrayType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<unknown[]>;
  valid: (val: unknown) => boolean;
  contains: () => Type;
  sub: (other: Type) => boolean;
  __ktype__: "array";
}

export interface StructType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<Record<string, any>>;
  valid: (val: unknown) => boolean;
  has: (key: string) => boolean;
  field: (key: string) => Type;
  fields: () => [string, Type][];
  sub: (other: Type) => boolean;
  __ktype__: "struct";
}

export interface TypeType {
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "type";
}
