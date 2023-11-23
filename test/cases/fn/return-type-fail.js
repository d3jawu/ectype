"use ectype";

import { fn, Num, Str } from "../../../core/core.js";

const MyFnType = fn([Str], Num);

const myFn = MyFnType.from((p) => {
  if (p === "apple") {
    return 10;
  }

  // Returning the wrong type should fail.
  ///RETURN_TYPE_MISMATCH
  return "abc";
});

// Should work for expression functions, too.

///RETURN_TYPE_MISMATCH
const myExpressionFn = MyFnType.from((n) => "abc");
