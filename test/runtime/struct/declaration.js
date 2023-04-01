"use ectype";
import { struct } from "../../../core/struct.js";
import { Num } from "../../../core/primitives.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const myPoint = Point2D.conform({
  x: 10,
});

export { Point2D };
