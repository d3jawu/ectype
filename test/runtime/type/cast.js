"use ectype";

import { Num, Type } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const A = Type.from(Point2D);
