"use ectype";

import { array } from "../../../core/array.js";
import { Num, Unknown } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";
import { ok } from "../../lib/assert.js";

const A = array(Num);
const B = array(Num);

ok(A.eq(B));
ok(B.eq(A));

const C = array(Num);
const D = array(Unknown);

ok(!C.eq(D));
ok(!D.eq(C));

const E = array(struct({ x: Num, y: Num, z: Num }));
const F = array(struct({ x: Num, y: Num }));

ok(!E.eq(F));
ok(!F.eq(E));
