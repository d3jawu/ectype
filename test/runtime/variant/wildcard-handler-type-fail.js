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
  Some: fn([], Null).from(() => {
    return null;
  }),
  _: fn([Str], Null).from((x) => {
    // Wildcard handler must have argument of type Unknown.
    return null;
  }),
});
