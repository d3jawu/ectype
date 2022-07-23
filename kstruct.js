"use strict";
// library

// base type
const Type = (val) => typeof val === "function" && val.__type__ === Type;
Type.__type__ = Type;

// primitive types
const Bool = (val) => typeof val === "boolean";
const Num = (val) => typeof val === "number";
const Fn = (val) => typeof val === "function";
const Obj = (val) => typeof val === "object";
const Str = (val) => typeof val === "string";
const Null = (val) => val === null;

// variant type (TODO)
const Variant = {};

const variant = (values) => {
  const valueEntries = Object.entries(values);

  const variant = (incoming) => {
    if (typeof incoming !== "object") {
      throw new Error("Variant instance must be specified with an object.");
    }

    const [[tag, val]] = Object.entries(incoming);

    return variant[tag](val);
  };

  valueEntries.forEach(([tag, type]) => {
    variant[tag] = (val) => {
      type(val);

      return Object.defineProperty({ [tag]: val }, "__type__", {
        value: variant,
        enumerable: false,
        configurable: false,
        writable: false,
      });
    };
  });

  variant.__type__ = Variant;

  return variant;
};

const directions = variant({
  North: Null,
  South: Null,
  East: Null,
  West: Null,
});

const IpAddr = variant({
  IPv4: Str,
  IPv6: Str,
});

const myAddr = IpAddr({ IPv4: "192.168.1.1" });
const myAddrAlt = IpAddr.IPv4("192.168.1.2");

console.log(myAddr);
console.log(myAddrAlt);

console.log(directions.North === directions.North);
console.log(directions.North === directions.South);

const { IPv4: addr4 } = myAddr;
console.log(addr4);

const option = (T) =>
  variant({
    Some: T,
    None: Null,
  });

const MaybeIP = option(IpAddr);

// const { Some: ip, None: none } = MaybeIP.Some({ IPv4: "192.168.1.3" });
const { Some: ip, None: none } = MaybeIP.None;
console.log(ip);
console.log(none);

// struct type (TODO)
let Struct = {};

const struct = (fields) => {
  // TODO ensure that all field values are types

  // annotation function
  const struct = (incoming) => {
    // TODO validate

    // apply type reference
    incoming.__type__ = struct;
    Object.defineProperty(incoming, "__type__", {
      writable: false,
      enumerable: false,
    });

    return incoming;
  };
  struct.__type__ = Struct;

  Object.entries(fields).forEach(([k, v]) => {
    fields[k] = v;
  });

  return struct;
};

// function types
const fn = () => {};

// pattern match
const match = () => {};

// Struct = struct({
//   subtype: (other) => {}, // if this is a subtype of other
//   is(other) {
//     return this.__type__ === other.__type__;
//   },
//  from(other) { // cast value into this type
//
//  }
// });

// creates a ktype using only information from the given value.
// some things are impossible to know, e.g. optional fields
// const infer = (val) => {};

// one-of a set of types. compatible with TS unions (?)
// const union = (types) => {
//   const union = () => {};

//   return union;
// };

// const tuple = (types) => {};

// === what do I want to be able to do? ===

// type construction (declare a type and get a reference to it)
// const MyStruct = struct({
//   x: Num,
//   y: Bool,
// });

// type annotation and checking
// const myStructInstance = MyStruct({});
// console.log(myStructInstance);

// type introsepction
// const myStructInstanceType = typeOf(myStructInstance);
// console.log(myStructInstanceType);

// parameterized types

// tuple types

// variants

// const linkedList = variant({
//   Node: [],
//   None: [],
// });

// const ipAddr = variant({});

// introspection on sum types

// error handling from sum types

// elegant destructuring from sum types

// function types

// additional validation/constraints

// meta (meaningful types of types)
// const myStructType = typeOf(MyStruct);

// typescript adaptation of the above

// Struct(MyStruct); // should be true
