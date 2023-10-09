"use ectype";
import { Num, array, variant } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const NumArray = array(Num);

const numArray = NumArray.conform([1, 2, 3]);

ok(
  variant.match(numArray, {
    Some: (arr) => {
      ok(arr[0] === 1);
      return true;
    },
    None: () => {
      return false;
    },
  })
);

const notNumArray = NumArray.conform(["a", "b", "c"]);

ok(
  variant.match(notNumArray, {
    Some: (arr) => {
      return false;
    },
    None: () => {
      return true;
    },
  })
);

export { NumArray };
