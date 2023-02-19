import type { NullType, BoolType, NumType, StrType, VoidType } from "./types";
import { None, someOf } from "./util.js";

// Void is a type that has no values.
const Void: VoidType = {
  from: (val) => {
    throw new Error(`No values can be created under the void type.`);
  },
  conform: (val) => {
    throw new Error(`No values with the void type exist.`);
  },
  valid: (val) => false,
  sub: (other) => other.__ktype__ === "void",
  toString: () => "Void",
  __ktype__: "void",
};

// Null is a type that only has one value, `null`.
const Null: NullType = {
  from: (val) => val,
  conform: (val) => (val === null ? someOf(null) : None),
  valid: (val) => val === null,
  sub: (other) => other.__ktype__ === "null",
  toString: () => "Num",
  __ktype__: "null",
};

const Bool: BoolType = {
  from: (val) => val,
  conform: (val) => (typeof val === "boolean" ? someOf(val) : None),
  valid: (val) => typeof val === "boolean",
  sub: (other) => other["__ktype__" as keyof typeof other] === "bool",
  toString: () => "Bool",
  __ktype__: "bool",
};

const Num: NumType = {
  from: (val) => val,
  conform: (val) => (typeof val === "number" ? someOf(val) : None),
  valid: (val) => typeof val === "number",
  sub: (other) => other["__ktype__" as keyof typeof other] === "num",
  toString: () => "Num",
  __ktype__: "num",
};

const Str: StrType = {
  from: (val) => val,
  conform: (val) => (typeof val === "string" ? someOf(val) : None),
  valid: (val) => typeof val === "string",
  sub: (other) => other.__ktype__ === "str",
  toString: () => "Str",
  __ktype__: "str",
};

export { Void, Null, Bool, Num, Str };
