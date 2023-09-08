"use ectype";
import { Bool, Num, array, fn } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const NumArray = array(Num);

const numArray = NumArray.conform([1, 2, 3]);

ok(
  numArray.when({
    Some: fn([NumArray], Bool).from((arr) => {
      ok(arr[0] === 1);
      return true;
    }),
    None: fn([], Bool).from(() => {
      return false;
    }),
  })
);

export { NumArray };
