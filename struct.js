// TODO struct type
let Struct = {};

const struct = (fields) => {
  // TODO ensure that all field values are types

  // cast incoming into instance of struct
  const struct = (incoming) => {
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
