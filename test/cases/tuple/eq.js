"use ectype";

import { Num, Str, tuple } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const A = tuple(Num, Num);
const B = tuple(Num, Num);

ok(A.eq(B));
ok(B.eq(A));

const C = tuple(Str);

ok(!A.eq(C));
ok(!C.eq(A));

const D = tuple(Num, Num, Num);

ok(!A.eq(D));
ok(!D.eq(A));
