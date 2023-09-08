"use ectype";
import { Str, cond } from "../../../core/core.js";

// Conditional predicate must return a boolean.
const Email = cond(Str, (val) => {
  return "uh oh";
});
