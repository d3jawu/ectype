import { array } from "../../../core/array.js";
import { Num } from "../../../core/primitives.js";

import { someOf } from "../../../core/util.js";

import { strict as assert } from "node:assert";

const NumArray = array(Num);

const numArray = NumArray.conform([1, 2, 3]);

assert.deepEqual(JSON.stringify(numArray), JSON.stringify(someOf([1, 2, 3])));

export { NumArray };
