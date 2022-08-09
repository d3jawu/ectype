import { typeOf } from "./types.js";
import { Null, Str } from "./primitives.js";
import { variant, Variant } from "./variant.js";

const option = (T) =>
  variant({
    Some: T,
    None: Null,
  });

const directions = variant({
  North: Null,
  South: Null,
  East: Null,
  West: Null,
});

let myDir = directions.North();
let myDir2 = directions.North();
let myDir3 = directions.South();
console.log(typeOf(myDir) === directions.North);
console.log(typeOf(myDir) === typeOf(myDir2));
console.log(typeOf(myDir) === typeOf(myDir3));

console.log(directions.has(myDir));

const IpAddr = variant({
  IPv4: Str,
  IPv6: Str,
});

const myAddr = IpAddr({ IPv4: "192.168.1.1" });
const myAddrAlt = IpAddr.IPv4("192.168.1.2");

console.log(myAddr);
console.log(myAddrAlt);

const { IPv4: addr4 } = myAddr;
console.log(addr4);
const MaybeIP = option(IpAddr);

console.log(MaybeIP.None());

let { Some: ip, None: none } = MaybeIP.Some({ IPv4: "192.168.1.3" });
console.log(ip);
console.log(none);

// ({ Some: ip, None: none } = MaybeIP.None());
const maybeVal = MaybeIP.None();
console.log(maybeVal);

console.log(typeOf(maybeVal) === MaybeIP.Some);

// struct type (TODO)
// let Struct = {};

// const struct = (fields) => {
//   // TODO ensure that all field values are types

//   // cast incoming into instance of struct
//   const struct = (incoming) => {
//     // TODO validate

//     // apply type reference
//     incoming.__type__ = struct;
//     Object.defineProperty(incoming, "__type__", {
//       writable: false,
//       enumerable: false,
//     });

//     return incoming;
//   };
//   struct.__type__ = Struct;

//   Object.entries(fields).forEach(([k, v]) => {
//     fields[k] = v;
//   });

//   return struct;
// };

// // function types
// const fn = () => {};

// // pattern match
// const match = () => {};

// Struct = struct({
//   subtype: (other) => {}, // if this is a subtype of other
//   is(other) {
//     return this.__type__ === other.__type__;
//   },
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
