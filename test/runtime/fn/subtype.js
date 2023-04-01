"use ectype";
import { fn } from "../../../core/fn.js";

import { struct } from "../../../core/struct.js";
import { Num } from "../../../core/primitives.js";

import { ok } from "../../lib/assert.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const Point3D = struct({
  x: Num,
  y: Num,
  z: Num,
});

ok(Point3D.sub(Point2D));

const Point3DToPoint2D = fn([Point3D], Point2D);
const Point2DToPoint3D = fn([Point2D], Point3D);

ok(Point2DToPoint3D.sub(Point3DToPoint2D));
ok(!Point3DToPoint2D.sub(Point2DToPoint3D));
