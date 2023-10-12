"use ectype";

import { Num, Str, tuple } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const MyTuple = tuple([Num, Str]);

const [first, second] = MyTuple.from([1, "a"]);

ok(first === 1);
ok(second === "a");
