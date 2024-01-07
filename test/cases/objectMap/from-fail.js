"use ectype";

import { objectMap, Str } from "../../../core/core.js";

const StrMap = objectMap(Str);

const map = StrMap.from({
  a: "bcd",
  ///CONTAINED_TYPE_MISMATCH
  b: 10,
});
