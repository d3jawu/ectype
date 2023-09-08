"use ectype";

import { fn, Null, Str, variant } from "../../../core/core.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.of({ Some: "abc" });

// Type-checking should fail when a handler matches a tag not found in the variant,
// even if all actual tags are handled.
someStr.match({
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
