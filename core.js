// First off, a couple utility functions, all prefixed with an underscore.

// `typed` sets __type__ in-place on a previously untyped object.
const _typed = (type, val) =>
  Object.defineProperty(val, "__type__", { value: type });

// `update` writes fields to an object in-place, to avoid reassignment.
const _update = (existing, updates) => {
  Object.entries(updates).forEach(([k, v]) => {
    existing[k] = v;
  });

  // __type__ can only be written once
  if (!!updates.__type__) {
    _typed(updates.__type__, existing);
  }
};

// `incomplete` retains a reference to an object or function that will need fields filled in later before
// initialization is complete, along with a tag referring to how to complete that object.
const _incompletes = [];
const _incomplete = (completion, val) => {
  _incompletes.push({ val, completion });

  return val;
};

// `as` creates a shallow copy of `val` with its type set to `type`.
// It does not perform any runtime type-checking.
const as = (type, val) =>
  ({
    object: () =>
      Object.defineProperty({ ...val }, "__type__", { value: type }),
    function: () => Object.defineProperty(val, "__type__", { value: type }),
  }[typeof val]());

// These Untyped types are used to represent types of incoming untyped values from JS,
// about which no guarantees can be made. Mainly used at app boundaries.
const UntypedObject = {};
const UntypedFunction = {};
const UntypedArray = {};

// ObjectMap and Type must be declared first so they can be referred to,
// and then filled out later. We set their keys to undefined now, so we can check
// later that all of them have been properly filled in.
// (An undefined key is not the same as an unset key; it appears during enumeration.)

// hard-coded Type for an ObjectMap that contains Types
// this is a very important type, because it describes the `fields` key that all types use
// to describe the values they create.
// We have to be careful to only use `ObjectMapOfType.of` during initialization, and not allow
// it to be used afterwards, because it creates incomplete values.

const ObjectMapOfType = _incomplete("ObjectMapOfTypeConstructor", {});
const Type = ObjectMapOfType; // alias

const incompleteObjectMapOfType = (obj) =>
  _incomplete(
    "ObjectMapOfTypeConstructor",
    as(ObjectMapOfType, {
      obj,
      // has: undefined,
      get: undefined, // map function implementations will go here.
      // set: undefined,
      // keys: undefined,
      // values: undefined,
      // eq: undefined,
    })
  );

_update(
  ObjectMapOfType,
  incompleteObjectMapOfType(
    _incomplete("ObjectMapOfTypeType", {
      // obj is not exposed on the type, it is used internally
      // has: undefined,
      get: undefined, // map function types will go here.
      // set: undefined,
      // keys: undefined,
      // values: undefined,
      // eq: undefined,
    })
  )
);

const Str = _incomplete("Str", incompleteObjectMapOfType({}));

const Bool = _incomplete("Bool", incompleteObjectMapOfType({}));

const FnFromStrToType = incompleteObjectMapOfType({
  param: Str,
  returns: Type,
});

// clean up incompletes
_incompletes
  .filter(({ completion }) => completion === "ObjectMapOfTypeType")
  .forEach(({ val }) => {
    _update(val, {
      get: FnFromStrToType,
    });
  });

_incompletes
  .filter(({ completion }) => completion === "ObjectMapOfTypeConstructor")
  .forEach(({ val }) => {
    _update(val, {
      get: as(FnFromStrToType, (key) => val.obj[key]),
    });
  });

console.log(_incompletes);
console.log(ObjectMapOfType.get("get"));
console.log(ObjectMapOfType.__type__);

// a type with no fields, that anything can be cast to.
// const Any = objectMapOfType({});
// bootstrapping boundary: at this point Type, ObjectMap, Fn are complete and all their features may be used safely without caveat.

const typeOf = (val) =>
  ({
    number: () => {
      throw new Error("Not yet implemented");
    },
    string: () => {
      throw new Error("Not yet implemented");
    },
    object: () => {
      if (val.__type__) {
        return val.__type__;
      } else {
        return Any;
      }
    },
  }[typeof val]());

// console.log(_incompletes);
