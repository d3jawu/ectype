"use ectype";
import { fn, Null, Str, variant } from "../../../core/core.js";

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
