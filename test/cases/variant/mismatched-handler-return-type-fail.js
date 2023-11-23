"use ectype";

import { fn, Num, Str, struct, variant } from "../../../core/core.js";

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
  ///RETURN_TYPE_MISMATCH
  None: () => {
    return null;
  },
});
