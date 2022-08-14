// a Type need only have a __type__ field.
// specific kinds of types (i.e. structs, variants) may require more than that.
// a value's __type__ should point at an object that describes the object.
// how exactly the object is described can differ.
const Type = (val) => {
  if (typeof val === "function" && val.__type__ === Type) {
    return val;
  }

  throw new Error(`${val} is not a type.`);
};
Type.__type__ = Type;

// TODO
const typeOf = (val) =>
  ({
    boolean: () => Bool,
    number: () => Num,
    string: () => Str,
    object: () => val.__type__,
  }[typeof val]());

export { Type, typeOf };
