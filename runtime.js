const Bool = Object.defineProperty(
  (val) => {
    if (typeof val === "boolean") return val;
    throw new Error(`${val} is not a boolean.`);
  },
  "__type__",
  { value: Type }
);
const Num = Object.defineProperty(
  (val) => {
    if (typeof val === "number") return val;
    throw new Error(`${val} is not a number.`);
  },
  "__type__",
  { value: Type }
);

const Str = Object.defineProperty(
  (val) => {
    if (typeof val === "string") return val;
    throw new Error(`${val} is not a string.`);
  },
  "__type__",
  { value: Type }
);

const Unit = Object.defineProperty(
  (val) => {
    if (val === false || val === undefined || val === null) {
      return null;
    }

    throw new Error(`${val} cannot be cast to null.`);
  },
  "__type__",
  { value: Type }
);

export { Bool, Num, Str, Unit };

const typeOf = (val) =>
  ({
    boolean: Bool,
    number: Num,
    string: Str,
    object: val.__type__,
    function: val.__type__,
  }[typeof val]);

export default typeOf;

// we need list, objectMap, fn, and struct types to define struct.
// since struct doesn't exist yet, we have to define them manually.

// StructType describes the type created when calling `struct()`.
// (That type describes the values created by its constructor.)
// StructType is built up over time.
let StructType = {
  fields: undefined,
  from: undefined,
};

// Make a StructType instance.
// StructType instances are not made with `struct()`.
const makeStructTypeInstance = (fields) => {
  return Object.defineProperty(
    {
      fields,
      // TODO replace "from" with struct() itself
      from: () => {
        throw new Error(
          "StructType cannot be constructed. Use `struct` instead."
        );
      },
    },
    "__type__",
    { value: StructType }
  );
};

// TODO don't allow casting to Type (so user has to go through existing means like struct)
const Type = makeStructTypeInstance({
  from: undefined,
});

// the object map type is first since it's needed early and doesn't contain any of the other types.
const ObjectMapType = makeStructTypeInstance({
  contains: Type,
});

makeObjectMapType = (contains) => {
  return Object.defineProperty(
    {
      contains,
    },
    "__type__",
    { value: ObjectMapType }
  );
};

// produces a fully valid objectMap type, but doesn't check against Type
// and isn't itself a typed function
const objectMap = (contains) => {
  return (incoming) => {};
};

// call ObjectMapType() with a version that doesn't call Type.
// Type cannot be called until Variant is defined, at the very end.
structType.fields = ObjectMapType;

let listType, ListType;
listType = Object.defineProperty(
  {
    fields: {
      contains: Type,
    },
  },
  "__type__",
  { value: structType }
);
ListType = (incoming) => {};

structType = Object.defineProperty({
  fields: objectMap(Type)[1],
});

// this is the code we actually want to be able to run:
ListType = struct({
  contains: Type,
});

const list = (type) => {
  const type = ListType({
    contains: type,
  });

  const constructor = (incoming) => {
    if (!Array.isArray) {
      throw new Error(
        `${incoming} is not an array (got ${typeof incoming} instead.)`
      );
    }

    // TODO adapt Array functions to type

    return Object.defineProperty([...incoming], "__type__", {
      value: type,
    });
  };

  return [constructor, type];
};

// TODO manually define this, since struct doesn't exist yet
let FnType = struct({
  params: list(Type)[0],
  returns: Type,
});

// TODO `fn` itself should be a typed function, right?
// generate a function type
const fn = (params, returns) => {
  const type = FnType(params, returns);

  const constructor = (fn) => {
    if (typeof fn !== "function") {
      throw new Error(`${fn} is not a function (got ${typeof fn} instead).`);
    }

    return Object.defineProperty(fn, "__type__", {
      value: FnType,
    });
  };

  // TODO tuple
  return [constructor, type];
};

export { fn, FnType };

// `struct` generates a constructor for this struct type, and a type object
const struct = (fields) => {
  // TODO check this with an objectMap(Type) instead of manually
  // make sure each field entry is a type
  Object.values(fields).forEach((type) => {
    Type(type);
  });

  // TODO resolve circular reference
  const type = makeStructTypeInstance({
    fields,
  });

  // cast incoming into instance of struct
  const constructor = (incoming) => {
    // check field types (extra fields allowed)
    Object.entries(fields).forEach(([field, fieldType]) => {
      fieldType(incoming[field]);
    });

    // apply type reference to shallow copy
    return Object.defineProperty({ ...incoming }, "__type__", {
      value: type,
    });
  };

  // TODO tuple
  return [constructor, type];
};

StructType = struct({
  fields: objectMap(Type)[1],
});

export { struct, StructType };

const VariantType = struct({
  tags: objectMap(Type)[1],
});

const variant = (values) => {
  const variant = (incoming) => {
    if (typeof incoming !== "object")
      throw new Error("Variant instance must be specified with an object.");

    // TODO error handle
    const [[tag, val]] = Object.entries(incoming);

    return variant[tag](val);
  };

  // constructors for variant tags. each tag is its own constructor.
  Object.entries(values).forEach(([tag, type]) => {
    variant[tag] = (val) => {
      val = type(val);

      return Object.defineProperty({ [tag]: val }, "__type__", {
        // TODO what should the type of a variant member be? not sure
        value: variant[tag],
      });
    };

    // set constructor's own type as the variant it belongs to
    Object.defineProperty(variant[tag], "__type__", {
      // TODO function type
      value: variant,
    });
  });

  return variant;
};

export { variant, VariantType };

[Type] = variant({
  StructType: StructType,
  // VariantType:
});

export { Type };

// "real" struct function
const struct = fn([objectMap(Type)], fn([objectMap()]));
