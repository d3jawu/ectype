// sets type in-place on a previously untyped object.
const typed = (type, val) =>
  Object.defineProperty(val, "__type__", { value: type });

// shallow-copies val into a new object with type.
const newTyped = (type, val) =>
  Object.defineProperty({ ...val }, "__type__", { value: type });

// writes fields to an object in-place
const update = (existing, updates) => {
  Object.entries(updates).forEach(([k, v]) => {
    existing[k] = v;
  });

  if (!!updates.__type__) {
    typed(updates.__type__, existing);
  }
};

// used to represent types of incoming untyped values from JS,
// about which no guarantees can be made. mainly used at app boundaries.
const UntypedObject = {};
const UntypedFunction = {};
const UntypedArray = {};

// placeholder
const ObjectMap = {
  // fields: ObjectMapOfType.from({
  //   contains: Type,
  //   from: FnFromUntypedObjectToObjectMap
  // })
};

const Type = {};

// hard-coded ObjectMap that contains Types
const ObjectMapOfType = typed(ObjectMap, {
  fields: {}, // TODO
  contains: Type,
  from: (obj) => newTyped(obj, ObjectMapOfType),
});

// type is the root self-describing type.
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

const List = {};

// hard-coded List that contains Types
const ListOfType = typed(List, {
  fields: ObjectMapOfType.from({
    // placeholder
  }),
  contains: Type,
  from: (list) => {
    if (!Array.isArray(list)) {
      throw new Error("must be a list");
    }

    return typed(ListOfType, list);
  },
});

const Fn = typed(Type, {
  fields: ObjectMapOfType.from({
    fields: ObjectMapOfType,
    params: ListOfType,
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

const FnFromTypeToType = Fn.of(Type, Type);
console.log(FnFromTypeToType);
console.log(FnFromTypeToType.__type__);

update(List, {
  fields: ObjectMapOfType.from({
    fields: ObjectMapOfType,
    contains: Type,
    // from: FnFromTypeToAny,
  }),
  from: (type) =>
    typed(
      {
        fields: ObjectMapOfType.from({
          get: FnFromNumTotype,
        }),
        contains: type,
        from: FnFromUntypedArrayTotype,
      },
      Type
    ),
});

// bootstrapping boundary: at this point, ObjectMap, Fn and List are fully complete and all their features may be used safely without caveat.
