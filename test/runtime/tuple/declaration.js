"use ectype";
import { tuple } from "../../../core/tuple.js";
import { Num, Str } from "../../../core/primitives.js";

const MyTuple = tuple([Num, Str]);

const myTuple = MyTuple.from([2, "asdf"]);

export { MyTuple };
