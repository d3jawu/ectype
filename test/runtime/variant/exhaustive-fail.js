"use ectype";

import { Null, Str, fn, variant } from "../../../core/core.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.of({ Some: "abc" });

// Type-checking should fail when a handler is missing.
someStr.when({
  Some: fn([Str], Null).from((s) => {
    return null;
  }),
});
