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

// Handlers cannot have different return types.
maybePoint.when({
  Some: fn([], Str).from(() => {
    return "";
  }),
  None: fn([], Null).from(() => {
    return null;
  }),
});
