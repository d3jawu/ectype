import Type from "./type.js";

// type for structs that describe structs.
// since it is itself a struct, we have to wait until the struct constructor exists to construct it.
let StructType;

// `struct` generates a constructor for this struct type, and a type object
const struct = (fields) => {
  // TODO check this with an objectMap(Type) instead of manually
  // make sure each field entry is a type
  Object.values(fields).forEach((type) => {
    Type(type);
  });

  const type = StructType({
    fields,
  })

  // cast incoming into instance of struct
  const constructor = (incoming) => {
    // check field types
    Object.entries(fields).forEach(([field, fieldType]) => {
      fieldType(incoming[field]);
    });

    // apply type reference to shallow copy
    return Object.defineProperty({...incoming}, "__type__", {
      value: StructType,
    });
  };

  // TODO tuple
  return [constructor, type];
};

StructType = struct({
  fields: objectMap()
})

export default { struct, StructType };