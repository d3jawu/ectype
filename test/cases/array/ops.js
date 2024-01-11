"use ectype";
import { array, Num } from "../../../core/core.js";

const NumArray = array(Num);

const numArray = NumArray.from([1, 2, 3]);

numArray[0] = 10;

let a = 1;
a = numArray[0];

numArray[0] + 10;
