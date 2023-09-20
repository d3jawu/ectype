"use ectype";

import { Num, Type, struct } from "../../../core/core.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const A = Type.from(Point2D);
