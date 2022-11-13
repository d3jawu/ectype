// First off, a couple utility functions.

// `typed` sets __type__ in-place on a previously untyped object.
const typed = (type, val) =>
  Object.defineProperty(val, "__type__", { value: type });

// `newTyped` shallow-copies `val` into a new object with type `type`.
const newTyped = (type, val) =>
  Object.defineProperty({ ...val }, "__type__", { value: type });

// `update` writes fields to an object in-place, to avoid reassignment.
const update = (existing, updates) => {
  Object.entries(updates).forEach(([k, v]) => {
    existing[k] = v;
  });

  // __type__ can only be written once
  if (!!updates.__type__) {
    typed(updates.__type__, existing);
  }
};

// `incomplete` retains a reference to an object or function that will need fields filled in later before
// initialization is complete, along with a tag referring to how to complete that object.
const incompletes = [];
const incomplete = (completion, val) => {
  incompletes.push({ val, completion });

  return val;
};

// These Untyped types are used to represent types of incoming untyped values from JS,
// about which no guarantees can be made. Mainly used at app boundaries.
const UntypedObject = {};
const UntypedFunction = {};
const UntypedArray = {};

// ObjectMap and Type must be declared first so they can be referred to,
// and then filled out later. We set their keys to undefined now, so we can check
// later that all of them have been properly filled in.
// (An undefined key is not the same as an unset key; it appears during enumeration.)
const ObjectMap = incomplete("ObjectMap", {
  fields: undefined,
  __type__: undefined,
  from: undefined,
});
const Type = incomplete("Type", {
  fields: undefined,
  __type__: undefined,
  from: undefined,
});

// hard-coded Type for an ObjectMap that contains Types
// this is a very important type, because it describes the `fields` key that all types use
// to describe the values they create.
// We have to be careful to only use `ObjectMapOfType.from` during initialization, and not allow
// it to be used afterwards, because it creates incomplete values.
const TempObjectMapOfType = typed(ObjectMap, {
  fields: incomplete("ObjectMapOfTypeFields", {}),
  contains: Type,
  of: (obj) =>
    incomplete(
      "ObjectMapOfTypeConstructor",
      newTyped(
        {
          obj,
          has: undefined,
          get: undefined,
          set: undefined,
          keys: undefined,
          values: undefined,
        },
        TempObjectMapOfType
      ) // This function needs to be typed
    ),
});

// Type is the root self-describing type.
update(Type, {
  fields: TempObjectMapOfType.of({
    fields: TempObjectMapOfType,
  }),
});
typed(Type, Type);

update(ObjectMap, {
  fields: TempObjectMapOfType.of({
    fields: TempObjectMapOfType,
    contains: Type,
  }),
});

// a type with no fields, that anything can be cast to.
const Any = typed(Type, {
  fields: TempObjectMapOfType.of({}),
  from: (val) => typed(val, Any),
});

const Fn = typed(Type, {
  fields: TempObjectMapOfType.of({
    fields: TempObjectMapOfType,
    params: Type,
    returns: Type,
    // from
  }),
  from: (type) => newTyped(type, Fn),
  of: (params, returns) => {
    const newFnType = Fn.from({
      fields: TempObjectMapOfType.from({}),
      params,
      returns,
      // from:
    });

    update(newFnType, {
      // TODO
      from: typed(Fn.of(), (fn) => newTyped(newFnType, fn)),
    });

    return newFnType;
  },
});
update(Fn.fields, {
  from: Fn.from(UntypedFunction, Fn),
});

// bootstrapping boundary: at this point Type, ObjectMap, Fn are complete and all their features may be used safely without caveat.

console.log(incompletes);

export { Type, ObjectMap, Fn, Any };
