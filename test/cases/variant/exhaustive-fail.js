"use ectype";

import { Null, Str, fn, variant } from "../../../core/core.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.from({ Some: "abc" });

// Type-checking should fail when a handler is missing.
///MATCH_HANDLER_MISSING
variant.match(someStr, {
  Some: (s) => {
    return null;
  },
});
