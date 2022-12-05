type Option<T> = { Some: T } | { None: null };

export type Type =
  | NullType
  | BoolType
  | NumType
  | StrType
  | VariantType
  | StructType
  | TypeType;

// `sub` returns true if this type is a subtype of `other` - that is,
// it can be safely used anywhere `other` is used.

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

export interface VariantType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<{ [key: string]: any }>;
  valid: (val: unknown) => boolean;
  has: (name: string) => boolean;
  option: (name: string) => Type;
  sub: (other: Type) => boolean;
  __ktype__: "variant";
}

export interface StructType {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<Record<string, any>>;
  valid: (val: unknown) => boolean;
  has: (key: string) => boolean;
  field: (key: string) => Type;
  sub: (other: Type) => boolean;
  __ktype__: "struct";
}

export interface TypeType {
  valid: (val: unknown) => boolean;
  sub: (other: Type) => boolean;
  __ktype__: "type";
}
