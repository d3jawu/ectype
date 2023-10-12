"use ectype";

import { Num, Str, tuple } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const MyTuple = tuple(Num, Str);

const myTuple = MyTuple.from([1, "a"]);

ok(myTuple[0] === 1);
ok(myTuple[1] === "a");
