"use ectype";
import { fn, js, Null, Str, variant } from "../../../core/core.js";

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
