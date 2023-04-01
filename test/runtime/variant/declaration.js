"use ectype";
import { strict as assert } from "node:assert";
import { variant } from "../../../core/variant.js";
import { Str, Void } from "../../../core/primitives.js";

const MaybeStr = variant({
  Some: Str,
  None: Void,
});

// Re-enable this test once type-checking on variant.of is implemented.
/*
const someStr = MaybeStr.of({ Some: "abc" });

assert.ok(someStr.isSome());
assert.ok(someStr.isNone() === false);
assert.ok(someStr.Some === "abc");

assert.ok(MaybeStr.option().valid(someStr));

const none = MaybeStr.of({ None: undefined });
assert.ok(none.isNone());
assert.ok(none.isSome() === false);

assert.ok(MaybeStr.option().valid(none));
*/
