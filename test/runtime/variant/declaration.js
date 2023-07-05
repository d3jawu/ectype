"use ectype";
import { Null, Str } from "../../../core/primitives.js";
import { variant } from "../../../core/variant.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
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
