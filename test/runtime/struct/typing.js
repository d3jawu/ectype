"use ectype";

import { MaybeStaticTest, TestConfig } from "../../lib/TestConfig.js";
const config = TestConfig.from({
  staticTest: MaybeStaticTest.of({ None: null }),
  analysisFails: true,
});
export { config };

import { Num } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const myPoint = Point2D.from({
  x: 10,
});
