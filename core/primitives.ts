"ectype:primitives";
import type {
  AnyType,
  BoolType,
  NullType,
  NumType,
  StrType,
  Type,
} from "./types";
import { None, someOf } from "./util.js";

// Any is the top type. It is analogous to `unknown` in TypeScript (not `any`).
const Any: AnyType = {
  baseType: "any",
  from: (val) => val,
  conform: (val: unknown) => someOf(val), // All values conform to Any.
  valid: (val: unknown) => true, // All values are valid instances of Any.
  sub: (other: Type): boolean => other.baseType === "any", // Only Any is a subtype of Any.
};

// Null is a type that only has one value, `null`.
const Null: NullType = {
  from: (val) => val,
  conform: (val) => (val === null ? someOf(null) : None),
  valid: (val) => val === null,
  sub: (other) => other.baseType === "null",
  toString: () => "Null",
  baseType: "null",
};

const Bool: BoolType = {
  from: (val) => val,
  conform: (val) => (typeof val === "boolean" ? someOf(val) : None),
  valid: (val) => typeof val === "boolean",
  sub: (other) => other["baseType" as keyof typeof other] === "bool",
  toString: () => "Bool",
  baseType: "bool",
};

const Num: NumType = {
  from: (val) => val,
  conform: (val) => (typeof val === "number" ? someOf(val) : None),
  valid: (val) => typeof val === "number",
  sub: (other) => other["baseType" as keyof typeof other] === "num",
  toString: () => "Num",
  baseType: "num",
};

const Str: StrType = {
  from: (val) => val,
  conform: (val) => (typeof val === "string" ? someOf(val) : None),
  valid: (val) => typeof val === "string",
  sub: (other) => other.baseType === "str",
  toString: () => "Str",
  baseType: "str",
};

export { Any, Bool, Null, Num, Str };
