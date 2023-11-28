/*
All Ectype files begin with "use ectype". This tells the type-checker that it can 
expect this file to use Ectype libraries for type annotations and check against 
their usages. Files without "use ectype" are treated as plain JS and ignored.
*/
"use ectype";

/*
Right out of the box, Ectype provides type-checking for primitives. Try changing 
the second assignment to a string, then run the type-checker on this file to see 
the detected type error.
*/
let x = 10;
x = 20;
// x = "abc"; // Causes the type-checker to fail.

/*
Types in Ectype are represented as constants. The convention is to name types with 
an uppercase letter. Numbers, for example, have the Num type. You can check a value 
against a type with the valid() function:
*/
import { Num } from "ectype";
Num.valid(10); // true
Num.valid("a string"); // false

/*
There are also primitives for boolean and string:
*/
import { Bool, Str } from "ectype";
Bool.valid(true);
Str.valid("abc");

/*
Unknown is an abstract type representing the top type. All values are valid instances 
of Unknown.
*/
import { Unknown } from "ectype";
Unknown.valid(null);

/*
Compound data types, such as structs, are declared with special "keyword functions".
Let's declare one now, for a 2D point with x and y coordinates:
*/
import { struct } from "ectype";
const Point2D = struct({
  x: Num,
  y: Num,
});

/*
Note that "struct" is a special function provided by Ectype, and is not a function
that the user can re-define or analyze like a normal function. Think about how
the keyword "struct" is treated in a language like C - you cannot re-define or 
alter it as a user of the language.
*/

/*
We also have compound data types for arrays and tuples.
*/
import { array, tuple } from "ectype";
const NumArray = array(Num);
const TwoNums = tuple(Num, Num);

/*
You can construct an instance of a type using "from()".
Like "struct", the "from" method is like a keyword - it is not a method the 
user can introspect.
*/
const myPoint = Point2D.from({
  x: 10,
  y: 20,
});

/*
Ectype will statically check values passed into "from" to ensure that their types
are correct. Uncomment the statement below and re-run the type-checker to see that 
this produces a static type error.
*/
// const notAPoint = Point2D.from({
//   x: "a",
//   y: "b",
// });

/*
Ectype also has a sum type, called "variant". You can declare one like so:
*/
import { variant } from "ectype";
const IpAddr = variant({
  V4: Str,
  V6: Str,
});

/*
And create an instance with from():
*/
const myIp = IpAddr.from({ V4: "192.168.1.1" });

/*
A variant can be matched against with "variant.match". Note that this is not a
general matching function, and only works on variant values.

When using "variant.match", the static analyzer will ensure you have handled 
all tags on the variant, and verify that the return types of all handlers match.
*/
variant.match(myIp, {
  V4: (ip) => {
    // ip here is typed to Str.
    return null;
  },
  V6: (ip) => {
    // ip here is typed to Str.
    return null;
  },
});

/*
If you don't want to handle all tags on the variant, you can omit them and still 
get an exhaustive match by using a wildcard handler instead:
*/
variant.match(myIp, {
  V4: (ip) => {
    // ip here is typed to Str.
    return null;
  },
  _: (ip) => {
    // ip here is typed to Unknown.
    // Not a V4 address.
    return null;
  },
});

/*
If you don't know the type of a value (for example, if it came from a web request),
you can get type coverage on it by using "conform" instead:
*/
const mysteryValue = "abc"; // Try changing this to something else (e.g. a number)!
const maybeStr = Str.conform(mysteryValue);

/*
"conform" returns option types wrapped around the target type.
So maybeStr will be have the type:

variant({
  Some: Str,
  None: Null,
});

You can pull out the validated value and get static type coverage on it with a 
variant match statement:
*/
variant.match(maybeStr, {
  Some: (myStr) => {
    // myStr is typed to Str.
    return null;
  },
  None: () => {
    // Not a string.
    return null;
  },
});

/*
TODO: generic type functions
*/
import { fn, Type } from "ectype";
const pair = fn([Type], Type).from((T) =>
  struct({
    a: T,
    b: T,
  }),
);

const NumPair = pair(Num);

/*
If a type on a variant is not known statically, you will have to provide a 
type-assertion before you can match against that type.
*/
variant.match(NumPair.conform({ a: 1, b: 2 }), {
  Some: [
    // Static assertion on a type the analyzer could not infer
    struct({ a: Num, b: Num }),
    (p) => {
      // p has type struct({ a: Num, b: Num }) here.
      return null;
    },
  ],
  _: () => {
    // assertion failed (or tag was not matched).
    // A wildcard is necessary if a static assertion is used.
    return null;
  },
});

/*
As Ectype matures and the type-checker becomes more powerful, certain cases will
no longer require "conform" because we can guarantee them statically. When that 
happens, you will get a warning that "conform" is unnecessary and "from" can 
safely be used instead.
*/

/*
TODO js()
*/
