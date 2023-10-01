"use ectype";

import { fn, Num, Str } from "../../../core/core.js";

const MyFnType = fn([Str], Num);

const myFn = MyFnType.from((p) => {
  if (p === "apple") {
    return 10;
  }

  // Returning the wrong type should fail.
  return "abc";
});
