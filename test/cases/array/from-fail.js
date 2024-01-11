"use ectype";
import { array, Num, Str } from "../../../core/core.js";

const NumArray = array(Num);

///ARG_TYPE_MISMATCH
const a = NumArray.from([1, 2, "a"]);
