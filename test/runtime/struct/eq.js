"use ectype";

import { Num, Str } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";
import { ok } from "../../lib/assert.js";

const A = struct({ a: Num, b: Num });
const B = struct({ a: Num, b: Num });

ok(A.eq(B));
ok(B.eq(A));

const C = struct({ a: Num, b: Num, c: Num });

ok(!A.eq(C));
ok(!C.eq(A));

const D = struct({ a: Num, b: Str });

ok(!A.eq(D));
ok(!D.eq(A));
