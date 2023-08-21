"use ectype";

import { Null, Str } from "../../../core/primitives.js";
import { variant } from "../../../core/variant.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

let someStr = MaybeStr.of({ Some: 10 });
