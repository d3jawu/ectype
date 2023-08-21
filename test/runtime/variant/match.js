"use ectype";
import { fn } from "../../../core/fn.js";
import { Null, Str } from "../../../core/primitives.js";
import { variant } from "../../../core/variant.js";

import { ok } from "../../lib/assert.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

let myStr = "";

let someStr = MaybeStr.of({ Some: "asdf" });

myStr = someStr.when({
  Some: fn([Str], Str).from((str) => str),
  None: fn([], Str).from(() => ""),
});

ok(myStr === "asdf");

someStr = MaybeStr.of({ None: null });

myStr = someStr.when({
  Some: fn([Str], Str).from((str) => str),
  None: fn([], Str).from(() => ""),
});

ok(myStr === "");
