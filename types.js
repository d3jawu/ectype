// a base type need only have a __type__ field. specific kinds of types (structs, variants) may require more than that.
const Type = (val) => typeof val === "function" && val.__type__ === Type;
Type.__type__ = Type;

const typeOf = (val) =>
  ({
    boolean: () => Bool,
    number: () => Num,
    string: () => Str,
    object: () => val.__type__,
  }[typeof val]());

export { Type, typeOf };
