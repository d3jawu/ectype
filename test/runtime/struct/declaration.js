"use ectype";

import { fn } from "../../../core/fn.js";
import { js } from "../../../core/js.js";
import { Null, Unknown } from "../../../core/primitives.js";
import { MaybeStaticTest, TestConfig } from "../../lib/TestConfig.js";
import { ok } from "../../lib/assert.js";
const config = TestConfig.from({
  staticTest: MaybeStaticTest.of({
    Some: fn([Unknown], Null).from((exports) =>
      js(() => {
        const Point2DType = exports["Point2D"];
        ok(Point2DType !== null);
        ok(Point2DType.baseType === "type");
        const Point2D = Point2DType.type();
        ok(Point2D.baseType === "struct");
      })
    ),
  }),
  analysisFails: false,
});
export { config };

import { Num } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const myPoint = Point2D.conform({
  x: 10,
});

export { Point2D };
