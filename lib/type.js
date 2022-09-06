// a Type need only have a __type__ field.
// specific kinds of types (i.e. structs, variants) may require more than that.
// a value's __type__ should point at an object that describes the object.
// how exactly the object is described can differ.
const Type = () => {
  // cast incoming into instance of Type
  const type = (val) => {
    if (typeof val !== "function" || val.__type__ !== _Type) {
      throw new Error(`${val} is not a type.`);
    }

    const out = { ...val };

    Object.defineProperty(out, "__type__", {
      value: type,
    });

    return out;
  };
};
Object.defineProperty(Type, "__type__", { value: Type });

export default Type;
