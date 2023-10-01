"use ectype";

import { fn, Num, Str } from "../../../core/core.js";

const MyFnType = fn([Str], Num);

const myExpressionFn = MyFnType.from((n) => "abc");
