import { array } from "../../core/array.js";
import { struct } from "../../core/struct.js";
import { Num } from "../../core/primitives.js";

import { someOf } from "../../core/util.js";

import { strict as assert } from "node:assert";

export function conform() {
  const NumArray = array(Num);

  const numArray = NumArray.conform([1, 2, 3]);

  assert.deepEqual(JSON.stringify(numArray), JSON.stringify(someOf([1, 2, 3])));
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

  const Point2DArray = array(Point2D);
  const Point3DArray = array(Point3D);

  assert.ok(Point3DArray.sub(Point2DArray));
  assert.ok(!Point2DArray.sub(Point3DArray));
}
