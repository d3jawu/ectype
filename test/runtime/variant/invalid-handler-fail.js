"use ectype";

import { fn } from "../../../core/fn.js";
import { Null, Str } from "../../../core/primitives.js";
import { variant } from "../../../core/variant.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.of({ Some: "abc" });

// Type-checking should fail when a handler matches a tag not found in the variant,
// even if all actual tags are handled.
someStr.when({
  Some: fn([Str], Null).from((s) => {
    return null;
  }),
  None: fn([], Null).from(() => {
    return null;
  }),
  NotInVariant: fn([], Null).from(() => {
    return null;
  }),
});