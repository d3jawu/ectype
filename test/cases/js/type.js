"use ectype";
import { js, Str } from "../../../core/core.js";

let x = "asdf";

x = js(() => {
  return "abcd";
}, Str);
