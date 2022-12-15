type Option<T> = { Some: T } | { None: null };

export type Type =
  | NullType
  | BoolType
  | NumType
  | StrType
  | FnType
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
  conform: (val: unknown) => { None: null }; // functions cannot be conformed at runtime.
  valid: (val: unknown) => false; // functions cannot be validated at runtime.
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
  get: (name: string) => Type; // gets the type held in that option.
  option: (name: string) => Type; // gets the wrapping struct type for that option.
  options: () => [string, Type][];
  sub: (other: Type) => boolean;
  __ktype__: "variant";
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