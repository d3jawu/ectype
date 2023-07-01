"use ectype";
import { strict as assert } from "node:assert";
import { fn } from "../../core/fn.js";
import { js } from "../../core/js.js";
import { Bool, Null } from "../../core/primitives.js";

const ok = js(() => (val) => assert.ok(val), fn([Bool], Null));

export { ok };
