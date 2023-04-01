"use ectype";
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

ok(Point2D.sub(Point2D));

ok(Point3D.sub(Point2D));
ok(!Point2D.sub(Point3D));

const Vector2D = struct({
  start: Point2D,
  end: Point3D,
});

const Vector3D = struct({
  start: Point3D,
  end: Point3D,
});

ok(Vector3D.sub(Vector2D));

ok(!Vector3D.sub(Point2D));
