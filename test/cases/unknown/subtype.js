"use ectype";
import {
  Bool,
  Null,
  Num,
  Str,
  Unknown,
  fn,
  struct,
  tuple,
  variant,
} from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

// Every type should be a subtype of Unknown.
ok(Null.sub(Unknown));
ok(Bool.sub(Unknown));
ok(Num.sub(Unknown));
ok(Str.sub(Unknown));
ok(struct({}).sub(Unknown));
ok(variant({}).sub(Unknown));
ok(fn([], Null).sub(Unknown));
ok(tuple().sub(Unknown));
