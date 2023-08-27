"use ectype";
import { array, fn, js, Null, Num } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const NumArray = array(Num);

const numArray = NumArray.conform([1, 2, 3]);

numArray.when({
  Some: fn([NumArray], Null).from((arr) => {
    ok(arr[0] === 1);
    return null;
  }),
  None: fn([], Null).from(() => {
    js(() => {
      throw new Error(`got None when should have been Some`);
    });
    return null;
  }),
});

export { NumArray };
