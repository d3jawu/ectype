"use ectype";

import { fn, Num, Str, struct } from "../../../core/core.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point2D.conform({
  x: 10,
  y: 20,
});

// Handlers cannot have different return types.
maybePoint.match({
  Some: fn([], Str).from(() => {
    return "";
  }),
  None: fn([], Null).from(() => {
    return null;
  }),
});
