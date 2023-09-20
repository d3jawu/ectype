"use ectype";

import { Null, Num, Str, variant } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const A = variant({ Some: Num, None: Null });
const B = variant({ Some: Num, None: Null });

ok(A.eq(B));
ok(B.eq(A));

const C = variant({ Some: Num, None: Null, Other: Null });

ok(!A.eq(C));
ok(!C.eq(A));

const D = variant({ Some: Str, None: Null });

ok(!A.eq(D));
ok(!D.eq(A));
