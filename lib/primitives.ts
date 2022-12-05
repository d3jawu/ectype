import type { Type } from "./core.js";

// Null is a type that only has one value, `null`.
const Null: Type<null> = {
  from: (val) => val,
  conform: (val) => (val === null ? { None: null } : { Some: null }),
  valid: (val) => val === null,
};

const Bool: Type<boolean> = {
  from: (val) => val,
  conform: (val) => (typeof val === "boolean" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "boolean",
};

const Num: Type<number> = {
  from: (val) => val,
  conform: (val) => (typeof val === "number" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "number",
};

const Str: Type<string> = {
  from: (val) => val,
  conform: (val) => (typeof val === "string" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "string",
};

export { Null, Bool, Num, Str };
