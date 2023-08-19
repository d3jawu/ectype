"ectype:primitives";
import type {
  BoolType,
  NullType,
  NumType,
  StrType,
  Type,
  TypeType,
  UnknownType,
} from "./types";
import { None, someOf } from "./util.js";

// Unknown is the top type. It is analogous to `unknown` in TypeScript.
const Unknown: UnknownType = {
  baseType: "unknown",
  from: (val) => val,
  conform: (val: unknown) => someOf(val), // All values conform to Unknown.
  valid: (val: unknown) => true, // All values are valid instances of Unknown.
  sub: (other: Type): boolean => other.baseType === "unknown", // Only Unknown is a subtype of Unknown.
  eq: (other) => other.baseType === "unknown",
  toString: () => "Unknown",
};

// Null is a type that only has one value, `null`.
const Null: NullType = {
  from: (val) => val,
  conform: (val) => (val === null ? someOf(null) : None),
  valid: (val) => val === null,
  sub: (other) => other.baseType === "null" || other.baseType === "unknown",
  eq: (other) => other.baseType === "null",
  toString: () => "Null",
  baseType: "null",
};

const Bool: BoolType = {
  from: (val) => val,
  conform: (val) => (typeof val === "boolean" ? someOf(val) : None),
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
  conform: (val) => (typeof val === "number" ? someOf(val) : None),
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
  conform: (val) => (typeof val === "string" ? someOf(val) : None),
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

export { Bool, Null, Num, Str, Type, Unknown };
