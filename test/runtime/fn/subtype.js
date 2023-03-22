import { fn } from "../../../core/fn.js";

import { struct } from "../../../core/struct.js";
import { Num } from "../../../core/primitives.js";

import { strict as assert } from "node:assert";

const Point2D = struct({
  x: Num,
  y: Num,
});

const Point3D = struct({
  x: Num,
  y: Num,
  z: Num,
});

assert.ok(Point3D.sub(Point2D));

const Point3DToPoint2D = fn([Point3D], Point2D);
const Point2DToPoint3D = fn([Point2D], Point3D);

assert.ok(Point2DToPoint3D.sub(Point3DToPoint2D));
assert.ok(!Point3DToPoint2D.sub(Point2DToPoint3D));
