"use ectype";

import { Num, struct } from "../../../core/core.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

///FROM_TYPE_MISMATCH
const myPoint = Point2D.from({
  x: 10,
});