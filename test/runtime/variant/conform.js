"use ectype";
import { fn } from "../../../core/fn.js";
import { js } from "../../../core/js.js";
import { Null, Str } from "../../../core/primitives.js";
import { variant } from "../../../core/variant.js";
import { ok } from "../../lib/assert.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.of({ Some: "abc" });

someStr.when({
  Some: fn([Str], Null).from((s) => {
    ok(s === "abc");
    return null;
  }),
  None: fn([], Null).from(() => {
    js(() => {
      throw new Error(`This branch should not run`);
    });

    return null;
  }),
});

const noneStr = MaybeStr.of({ None: null });

noneStr.when({
  Some: fn([Str], Null).from((s) => {
    js(() => {
      throw new Error(`This branch should not run`);
    });

    return null;
  }),
  None: fn([Null], Null).from((n) => {
    ok(n === null);
    return null;
  }),
});
