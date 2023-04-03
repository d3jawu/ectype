"use ectype";
import { array } from "../../../core/array.js";
import { Num, Void } from "../../../core/primitives.js";

import { someOf } from "../../../core/util.js";

import { js } from "../../../core/js.js";

import { strict as assert } from "node:assert";

const NumArray = array(Num);

const numArray = NumArray.from(["asdf"]);

export { NumArray };
