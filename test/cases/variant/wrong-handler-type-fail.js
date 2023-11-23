"use ectype";

import { Num, Str, struct, variant } from "../../../core/core.js";

const Point2D = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point2D.conform({
  x: 10,
  y: 20,
});

// TODO: with the reworks to variant, I'm not sure this test is actually testing
// what it should be.
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
