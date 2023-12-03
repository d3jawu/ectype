"use ectype";

import { Num, Str, fn, fna } from "../../../core/core.js";

const FnType = fn([Num], Str);

///ASYNC_MISMATCH
const myFn = FnType.from(async (n) => "abc");

const FnaType = fna([Num], Str);

///ASYNC_MISMATCH
const myFna = FnaType.from((n) => "abc");
