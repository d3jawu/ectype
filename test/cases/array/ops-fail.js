"use ectype";
import { array, Num } from "../../../core/core.js";

const NumArray = array(Num);

const numArray = NumArray.from([1, 2, 3]);

///CONTAINED_TYPE_MISMATCH
numArray[0] = "abc";
