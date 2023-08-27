"use ectype";
import { strict as assert } from "node:assert";
import { Bool, Null, fn, js } from "../../core/core.js";

const ok = js(() => (val) => assert.ok(val), fn([Bool], Null));

export { ok };
