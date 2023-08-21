"use ectype";

import { fn } from "../../../core/fn.js";
import { Num, Str } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point2D.conform({
  x: 10,
  y: 20,
});

maybePoint.when({
  Some: fn([struct({ a: Str, b: Str })], Null).from((pair) => {
    pair.a = "oh no"; // If allowed, this would be a static guarantee of field of the wrong type
    return null;
  }),
  None: fn([], Null).from(() => {
    return null;
  }),
});
