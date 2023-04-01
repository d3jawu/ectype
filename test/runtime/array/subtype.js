"use ectype";
import { array } from "../../../core/array.js";
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

const Point2DArray = array(Point2D);
const Point3DArray = array(Point3D);

ok(Point3DArray.sub(Point2DArray));
ok(!Point2DArray.sub(Point3DArray));
