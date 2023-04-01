"use ectype";
import { strict as assert } from "node:assert";
import { Void, Bool } from "../../core/primitives.js";
import { fn } from "../../core/fn.js";
import { js } from "../../core/js.js";

const ok = js(() => (val) => assert.ok(val), fn([Bool], Void));

export { ok };
