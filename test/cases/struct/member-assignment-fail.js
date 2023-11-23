"use ectype";

import { Num, struct } from "../../../core/core.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const myPoint = Point2D.from({
  x: 10,
  y: 20,
});

///KEY_TYPE_MISMATCH
myPoint.x = "abc";
