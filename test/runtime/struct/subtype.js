"use ectype";
import { struct } from "../../../core/struct.js";
import { Num } from "../../../core/primitives.js";

import { someOf, None } from "../../../core/util.js";

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

assert.ok(Point2D.sub(Point2D), "It should be a subtype of itself");

assert.ok(Point3D.sub(Point2D));
assert.ok(!Point2D.sub(Point3D));

const Vector2D = struct({
  start: Point2D,
  end: Point3D,
});

const Vector3D = struct({
  start: Point3D,
  end: Point3D,
});

assert.ok(Vector3D.sub(Vector2D));

assert.ok(!Vector3D.sub(Point2D));
