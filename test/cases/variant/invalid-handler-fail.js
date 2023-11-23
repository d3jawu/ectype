"use ectype";

import { fn, Null, Str, variant } from "../../../core/core.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.from({ Some: "abc" });

// Type-checking should fail when a handler matches a tag not found in the variant,
// even if all actual tags are handled.
variant.match(someStr, {
  Some: (s) => {
    return null;
  },
  None: () => {
    return null;
  },
  ///VARIANT_TAG_NAME
  NotInVariant: () => {
    return null;
  },
});
