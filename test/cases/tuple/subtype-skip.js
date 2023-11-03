"use ectype";
import { Num, Str, struct, tuple } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const Tuple1 = tuple(Num, Str);
const Tuple2 = tuple(Num, Str, Num);
ok(Tuple2.sub(Tuple1));
ok(!Tuple1.sub(Tuple2));

const Point2D = struct({
  x: Num,
  y: Num,
});

const Point3D = struct({
  x: Num,
  y: Num,
  z: Num,
});

const Tuple3 = tuple(Point2D, Point3D);
const Tuple4 = tuple(Point3D, Point3D);

ok(Tuple4.sub(Tuple3));
ok(!Tuple3.sub(Tuple4));
