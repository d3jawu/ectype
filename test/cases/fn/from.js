"use ectype";
import { fn, Num, Str } from "../../../core/core.js";

const MyFnType = fn([Str], Num);

const myFn = MyFnType.from((p) => {
  if (p === "apple") {
    return 10;
  }

  return 20;
});

const myExpressionFn = MyFnType.from((n) => 30);
