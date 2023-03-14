import { tuple } from "../../../core/tuple.js";
import { struct } from "../../../core/struct.js";

import { Num, Str } from "../../../core/primitives.js";

import { strict as assert } from "node:assert";

export function subtype() {
  const Tuple1 = tuple([Num, Str]);
  const Tuple2 = tuple([Num, Str, Num]);
  assert.ok(Tuple2.sub(Tuple1));
  assert.ok(!Tuple1.sub(Tuple2));

  const Point2D = struct({
    x: Num,
    y: Num,
  });

  const Point3D = struct({
    x: Num,
    y: Num,
    z: Num,
  });

  const Tuple3 = tuple([Point2D, Point3D]);
  const Tuple4 = tuple([Point3D, Point3D]);

  assert.ok(Tuple4.sub(Tuple3));
  assert.ok(!Tuple3.sub(Tuple4));
}
