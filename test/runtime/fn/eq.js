"use ectype";

import { fn, Num, Str } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const A = fn([], Num);
const B = fn([], Num);

ok(A.eq(B));
ok(B.eq(A));

const C = fn([Num, Num], Str);
const D = fn([Num, Num], Str);

ok(C.eq(D));
ok(D.eq(C));

// Different return types
const E = fn([], Num);
const F = fn([], Str);

ok(!E.eq(F));
ok(!F.eq(E));

// Different arity
const G = fn([Num], Num);
const H = fn([Num, Num], Num);

ok(!G.eq(H));
ok(!H.eq(G));
