import list from "./list.js";
import struct from "./struct.js";
import { Type } from "./type.js";

let FnType = struct({
  params: list(Type)[0],
  returns: Type,
});

// TODO `fn` itself should be a typed function, right?
// generate a function type
const fn = (params, returns) => {
  const type = FnType(params, returns);

  const constructor = (fn) => {
    if (typeof fn !== "function") {
      throw new Error(`${fn} is not a function (got ${typeof fn} instead).`);
    }

    return Object.defineProperty(fn, "__type__", {
      value: FnType,
    });
  };

  // TODO tuple
  return [constructor, type];
};

export { fn, FnType };
