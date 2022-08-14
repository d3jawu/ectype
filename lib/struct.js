import { Type } from "./types.js";

// TODO struct type
let Struct = {};

const struct = (fields) => {
  // make sure each field entry is a type
  Object.values(fields).forEach((type) => {
    Type(type);
  });

  // cast incoming into instance of struct
  const struct = (incoming) => {
    // check field types
    Object.entries(fields).forEach(([field, fieldType]) => {
      fieldType(incoming[field]);
    });

    // shallow copy
    const out = { ...incoming };

    // apply type reference
    Object.defineProperty(out, "__type__", {
      value: struct,
    });

    return out;
  };

  Object.defineProperty(struct, "__type__", {
    value: Struct,
  });

  // shallow copy fields
  struct.fields = { ...fields };

  // TODO
  struct.from = () => {
    throw new Error("Not yet implemented");
  };

  return struct;
};

export { Struct, struct };
