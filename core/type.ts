"ectype:Type";
import { TypeType } from "./types.js";

// Type is the abstract type representing all type-values. Like Unknown, it cannot be instantiated directly
// and is meant to be used as a placeholder where the specific type is not known (e.g. in generic functions).
const valid = (val: unknown) =>
  typeof val === "object" && val !== null && "baseType" in val;

const Type: TypeType = {
  baseType: "type",
  sub: valid, // TODO
  valid,
  toString: () => "Type",
  type: () => Type, // Not callable at runtime.
  eq: (other) => other.baseType === "type",
};

export { Type };
