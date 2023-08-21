"use ectype";
import { fn } from "../../../core/fn.js";

import { Num } from "../../../core/primitives.js";

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
