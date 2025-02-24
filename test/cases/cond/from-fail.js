"use ectype";
import { Str, cond } from "../../../core/core.js";

const Email = cond(Str, (val) => {
  return val.includes("@");
});

// Using "from" on a cond type should cause type-checking to fail.
///INVALID_TYPE_METHOD
const email = Email.from("a@b");
