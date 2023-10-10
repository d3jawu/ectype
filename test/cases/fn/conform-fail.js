"use ectype";
import { fn, Num, Str } from "../../../core/core.js";

const MyFnType = fn([Str], Num);

// A function cannot be conformed because its type cannot be checked at runtime.
const myFn = MyFnType.conform((p) => {
  if (p === "apple") {
    return 10;
  }

  return 20;
});

const myExpressionFn = MyFnType.from((n) => 30);
