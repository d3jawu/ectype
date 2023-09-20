"use ectype";
import { fn, Num } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const MyFnType = fn([Num], Num);

const myFn1 = MyFnType.from((n) => {
  if (n === 1) {
    return 0;
  }

  return myFn2(n - 1);
});

const myFn2 = MyFnType.from((n) => {
  if (n === 1) {
    return 0;
  }

  return myFn1(n - 1);
});

ok(myFn1(10) === 0);
