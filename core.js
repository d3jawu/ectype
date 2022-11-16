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
  Object.defineProperty({ ...val }, "__type__", { value: type });

// These Untyped types are used to represent types of incoming untyped values from JS,
// about which no guarantees can be made. Mainly used at app boundaries.
const UntypedObject = {};
const UntypedFunction = {};
const UntypedArray = {};

// ObjectMap and Type must be declared first so they can be referred to,
// and then filled out later. We set their keys to undefined now, so we can check
// later that all of them have been properly filled in.
// (An undefined key is not the same as an unset key; it appears during enumeration.)
const ObjectMapType = _incomplete("ObjectMap", {
  fields: undefined,
  __type__: undefined,
});
const Type = _incomplete("Type", {
  fields: undefined,
  __type__: undefined,
});
_typed(Type, Type);

// hard-coded Type for an ObjectMap that contains Types
// this is a very important type, because it describes the `fields` key that all types use
// to describe the values they create.
// We have to be careful to only use `ObjectMapOfType.of` during initialization, and not allow
// it to be used afterwards, because it creates incomplete values.
const IncompleteObjectMapOfType = _typed(ObjectMapType, {
  fields: _incomplete("ObjectMapOfTypeFields", {}),
  contains: Type,
  of: (obj) =>
    _incomplete("ObjectMapOfTypeConstructor", {
      obj,
      has: undefined,
      get: undefined,
      set: undefined,
      keys: undefined,
      values: undefined,
      __type__: undefined,
    }),
});

// Type is the root self-describing type.
_update(Type, {
  fields: IncompleteObjectMapOfType.of({
    fields: IncompleteObjectMapOfType,
  }),
});

_update(ObjectMapType, {
  fields: IncompleteObjectMapOfType.of({
    fields: IncompleteObjectMapOfType,
    contains: Type,
  }),
});

// a type with no fields, that anything can be cast to.
const Any = _typed(Type, {
  fields: IncompleteObjectMapOfType.of({}),
});

const FnType = _typed(Type, {
  fields: IncompleteObjectMapOfType.of({
    fields: IncompleteObjectMapOfType,
    param: Type,
    returns: Type,
  }),
  // incomplete: `of` needs to be a typed function
  // and it needs its Incomplete call
  of: (param, returns) => {
    return as(FnType, {
      fields: IncompleteObjectMapOfType.of({}),
      param,
      returns,
    });
  },
});

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

console.log(_incompletes);
console.log(FnType.of(Type, Type));

export { Type, ObjectMapType as ObjectMap, Any };
