// a Type need only have a __type__ field.
// specific kinds of types (i.e. structs, variants) may require more than that.
// a value's __type__ should point at an object that describes the object.
// how exactly the object is described can differ.
const Type = (() => {
  const _Type = {};

  return (val) => {
    if (typeof val === "function" && val.__type__ === _Type) {
      return val;
    }

    throw new Error(`${val} is not a type.`);
  };
})();
Object.defineProperty(Type, "__type__", { value: Type });

export default Type;
