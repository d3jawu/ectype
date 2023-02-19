import type { TypeType } from "./types.js";

// the type that describes type-values themselves.
const Type: TypeType = {
  sub: (other) => false,
  valid: (val) =>
    typeof val === "object" && val !== null && val.hasOwnProperty("__ktype__"),
  toString: () => "Type",
  __ktype__: "type",
};

export { Type };
