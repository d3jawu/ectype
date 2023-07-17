"use ectype";

import { struct } from "../../../dist/core/struct.js";

import { Num } from "../../../dist/core/primitives.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const myPoint = Point2D.from({
  x: 10,
  y: 20,
});

myPoint.x = "abc";
