"use ectype";

import { Num } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const myPoint = Point2D.from({
  x: 10,
});
