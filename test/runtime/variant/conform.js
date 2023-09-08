"use ectype";
import { Bool, fn, Null, Str, variant } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.of({ Some: "abc" });

ok(
  someStr.when({
    Some: fn([Str], Bool).from((s) => {
      ok(s === "abc");
      return true;
    }),
    None: fn([], Bool).from(() => {
      return false;
    }),
  })
);

const noneStr = MaybeStr.of({ None: null });

ok(
  noneStr.when({
    Some: fn([Str], Bool).from((s) => {
      return false;
    }),
    None: fn([Null], Bool).from((n) => {
      ok(n === null);
      return true;
    }),
  })
);
