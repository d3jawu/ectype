import typeOf from "./lib/typeOf.js";
import { Null, Num, Bool, Str } from "./lib/primitives.js";
import Variant from "./lib/variant.js";
import { option } from "./lib/stdlib.js";
import Struct from "./lib/struct.js";

// variants
const directions = Variant({
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

const IpAddr = Variant({
  IPv4: Str,
  IPv6: Str,
});

const myAddr = IpAddr({ IPv4: "192.168.1.1" });
const myAddrAlt = IpAddr.IPv4("192.168.1.2");

console.log(myAddr);
console.log(myAddrAlt);

const { IPv4: addr4 } = myAddr;
console.log(addr4);

// option type
const MaybeIP = option(IpAddr);

console.log(MaybeIP.None());

let { Some: ip, None: none } = MaybeIP.Some({ IPv4: "192.168.1.3" });
console.log(ip);
console.log(none);

// ({ Some: ip, None: none } = MaybeIP.None());
const maybeVal = MaybeIP.None();
console.log(maybeVal);

console.log(typeOf(maybeVal) === MaybeIP.Some);

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

// structs (record types)

// type construction (declare a type and get a reference to it)
const MyStruct = Struct({
  x: Num,
  y: Bool,
});

// type annotation and checking
const myStructInstance = MyStruct({
  x: 20,
  y: false,
});
// console.log(myStructInstance);

const MaybeMyStruct = option(MyStruct);
const maybeMyStruct = MaybeMyStruct.Some({
  x: 30,
  y: false,
});

console.log(MaybeMyStruct);
console.log(maybeMyStruct);

// type introsepction
// const myStructInstanceType = typeOf(myStructInstance);
// console.log(myStructInstanceType);

// parameterized types

// tuple types

// introspection on sum types

// error handling from sum types

// elegant destructuring from sum types

// function types

// additional validation/constraints

// meta (meaningful types of types)
// const myStructType = typeOf(MyStruct);

// typescript adaptation of the above

// Struct(MyStruct); // should be true
