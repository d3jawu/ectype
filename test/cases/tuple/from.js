"use ectype";
import { Num, Str, tuple } from "../../../core/core.js";

const MyTuple = tuple(Num, Str);

const myTuple = MyTuple.from([2, "asdf"]);

export { MyTuple };
