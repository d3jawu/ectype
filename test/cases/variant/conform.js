"use ectype";
import { Null, Str, variant } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.from({ Some: "abc" });

ok(
  variant.match(someStr, {
    Some: (s) => {
      ok(s === "abc");
      return true;
    },
    None: () => {
      return false;
    },
  }),
);

const noneStr = MaybeStr.from({ None: null });

ok(
  variant.match(noneStr, {
    Some: (s) => {
      return false;
    },
    None: (n) => {
      ok(n === null);
      return true;
    },
  }),
);
