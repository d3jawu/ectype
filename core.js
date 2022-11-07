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

// used to represent types of incoming untyped values from JS,
// about which no guarantees can be made. mainly used at app boundaries.
const UntypedObject = {};
const UntypedFunction = {};
const UntypedArray = {};

// ObjectMap and Type must be declared first so they can be referred to,
// and then filled out later.
const ObjectMap = {};
const Type = {};

// hard-coded ObjectMap that contains Types
// this is a very important type, because it describes the `fields` key that all types use
// to describe the values they create.
const ObjectMapOfType = typed(ObjectMap, {
  fields: {}, // TODO set this to ObjectMap fields. Needing to later update interior values sucks.
  contains: Type,
  from: (obj) => newTyped(obj, ObjectMapOfType),
});

update(ObjectMapOfType.fields, {
  fields: ObjectMapOfType.from({
    fields: ObjectMapOfType,
    contains: Type,
  }),
});

// Type is the root self-describing type.
update(Type, {
  fields: ObjectMapOfType.from({
    fields: ObjectMapOfType,
  }),
});
typed(Type, Type);

update(ObjectMap, {
  fields: ObjectMapOfType.from({
    fields: ObjectMapOfType,
    contains: Type,
  }),
});

// a type with no fields, that anything can be cast to.
const Any = typed(Type, {
  fields: ObjectMapOfType.from({}),
  from: (val) => typed(val, Any),
});

const Fn = typed(Type, {
  fields: ObjectMapOfType.from({
    fields: ObjectMapOfType,
    params: Type,
    returns: Type,
    // from
  }),
  from: (type) => newTyped(type, Fn),
  of: (params, returns) => {
    const newFnType = Fn.from({
      fields: ObjectMapOfType.from({}),
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

export { Type, ObjectMap, Fn };
