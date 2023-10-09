"use ectype";
import { Str, cond, variant } from "../../../core/core.js";
import { ok } from "../../lib/assert.js";

const Email = cond(Str, (val) => {
  return val.includes("@");
});

ok(
  variant.match(Email.conform("a@b"), {
    Some: () => {
      return true;
    },
    None: () => {
      return false;
    },
  })
);

ok(
  variant.match(Email.conform("ab"), {
    Some: () => {
      return false;
    },
    None: () => {
      return true;
    },
  })
);
