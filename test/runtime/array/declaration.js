"use ectype";
import { array } from "../../../core/array.js";
import { Num, Void } from "../../../core/primitives.js";

const NumArray = array(Num);

const numArray = NumArray.from([1, 2, 3]);

export { NumArray };
