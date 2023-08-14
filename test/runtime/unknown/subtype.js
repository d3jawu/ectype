"use ectype";
import { fn } from "../../../core/fn.js";
import { struct } from "../../../core/struct.js";
import { tuple } from "../../../core/tuple.js";
import { variant } from "../../../core/variant.js";

import { Bool, Null, Num, Str, Unknown } from "../../../core/primitives.js";

import { ok } from "../../lib/assert.js";

// Every type should be a subtype of Unknown.
ok(Null.sub(Unknown));
ok(Bool.sub(Unknown));
ok(Num.sub(Unknown));
ok(Str.sub(Unknown));
ok(struct({}).sub(Unknown));
ok(variant({}).sub(Unknown));
ok(fn([], Null).sub(Unknown));
ok(tuple([]).sub(Unknown));
