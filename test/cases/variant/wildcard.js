"use ectype";
import { Null, Str, variant } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

let myStr = "";

let someStr = MaybeStr.from({ Some: "asdf" });

myStr = variant.match(someStr, {
  Some: (str) => str,
  _: () => "",
});

ok(myStr === "asdf");

someStr = MaybeStr.from({ None: null });

myStr = variant.match(someStr, {
  Some: (str) => str,
  _: () => "",
});

ok(myStr === "");
