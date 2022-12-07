import { struct } from "../../lib/core/structures.js";
import { Num } from "../../lib/core/primitives.js";

import { strict as assert } from "node:assert";

export function conform() {
  const Point = struct({
    x: Num,
    y: Num,
  });

  const maybePoint = Point.conform({
    x: 20,
    y: 30,
  });

  assert.deepEqual(maybePoint, {
    Some: {
      x: 20,
      y: 30,
    },
  });

  const Vector = struct({
    start: Point,
    end: Point,
  });

  const maybeVector = Vector.conform({
    start: {
      x: 10,
      y: 15,
    },
    end: {
      x: 20,
      y: 40,
    },
  });

  assert.deepEqual(maybeVector, {
    Some: {
      start: {
        x: 10,
        y: 15,
      },
      end: {
        x: 20,
        y: 40,
      },
    },
  });
}

export function subtype() {
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
}
