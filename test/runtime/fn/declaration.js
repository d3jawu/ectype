"use ectype";
import { fn } from "../../../core/fn.js";

import { Num, Str } from "../../../core/primitives.js";

const MyFnType = fn([Str], Num);

const myFn = MyFnType.from((p) => {
  if (p === "apple") {
    return 10;
  }

  return 20;
});
