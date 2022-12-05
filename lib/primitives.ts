import type { NullType, BoolType, NumType, StrType } from "./types";

// Null is a type that only has one value, `null`.
const Null: NullType = {
  from: (val) => val,
  conform: (val) => (val === null ? { None: null } : { Some: null }),
  valid: (val) => val === null,
  sub: (other) => other.kind === "null",
  kind: "null",
};

const Bool: BoolType = {
  from: (val) => val,
  conform: (val) => (typeof val === "boolean" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "boolean",
  sub: (other) => other["kind" as keyof typeof other] === "bool",
  kind: "bool",
};

const Num: NumType = {
  from: (val) => val,
  conform: (val) => (typeof val === "number" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "number",
  sub: (other) => other["kind" as keyof typeof other] === "num",
  kind: "num",
};

const Str: StrType = {
  from: (val) => val,
  conform: (val) => (typeof val === "string" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "string",
  sub: (other) => other.kind === "str",
  kind: "str",
};

export { Null, Bool, Num, Str };
