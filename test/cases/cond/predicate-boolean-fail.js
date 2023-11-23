"use ectype";
import { Str, cond } from "../../../core/core.js";
///CONDITION_TYPE_MISMATCH
const Email = cond(Str, (val) => {
  return "uh oh";
});
