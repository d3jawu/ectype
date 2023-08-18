"use ectype";

import { Bool, Null, Num, Str, Unknown } from "../../../core/primitives.js";
import { ok } from "../../lib/assert.js";

ok(Unknown.eq(Unknown));
ok(Null.eq(Null));
ok(Bool.eq(Bool));
ok(Num.eq(Num));
ok(Str.eq(Str));
