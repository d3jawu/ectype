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

const Point2D = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point2D.conform({
  x: 10,
  y: 20,
});

// Handlers cannot have different return types.
variant.match(maybePoint, {
  Some: () => {
    return "";
  },
  ///HANDLER_RETURN_TYPE_MISMATCH
  None: () => {
    return null;
  },
});

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

// Even if the asserted type is wrong, the handler should still check against
// that type and catch invalid operations on it.
variant.match(maybePoint, {
  Some: [
    struct({ a: Str, b: Str }),
    (pair) => {
      ///INVALID_FIELD
      pair.w;
      return null;
    },
  ],
  None: () => {
    return null;
  },
  _: () => {
    return null;
  },
});
