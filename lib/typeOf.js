import { Bool, Num, Str } from "./primitives.js";

// TODO
const typeOf = (val) =>
  ({
    boolean: Bool,
    number: Num,
    string: Str,
    object: val.__type__,
    function: val.__type__,
  }[typeof val]);

export default typeOf;
