"use ectype";
import { Bool, Str, cond, fn } from "../../../core/core.js";
import { ok } from "../../lib/assert.js";

const Email = cond(Str, (val) => {
  return val.includes("@");
});

ok(
  Email.conform("a@b").when({
    Some: fn([], Bool).from(() => {
      return true;
    }),
    None: fn([], Bool).from(() => {
      return false;
    }),
  })
);

ok(
  Email.conform("ab").when({
    Some: fn([], Bool).from(() => {
      return false;
    }),
    None: fn([], Bool).from(() => {
      return true;
    }),
  })
);
