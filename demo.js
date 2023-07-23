/*
All Ectype files begin with "use ectype". This tells the type-checker that it can expect this file to use
ectype libraries for type annotations and check against their usages. Files without "use ectype" are ignored.
*/
"use ectype";

/*
Right out of the box, Ectype provides type-checking for primitives. Try changing the second assignment to a 
string, then run the type-checker on this file to see the detected type error.
*/
let x = 10;
x = 20;

/*
In Ectype, all types are also values. Numbers, for example, have the Num type. You can check a value against a
type with the valid() function:
*/
import { Num } from "ectype";
Num.valid(10); // true
Num.valid("a string"); // false

/*
Ectype also provides types for compound data types, such as structs. Let's declare one now, for a 2D point
with x and y coordinates:
*/
import { struct } from "ectype";
const Point2D = struct({
  x: Num,
  y: Num,
});
