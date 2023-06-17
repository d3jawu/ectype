"use ectype";
import { js } from "../../../core/js.js";
import { Str } from "../../../core/primitives.js";

let x = "asdf";

x = js(() => {
  return "abcd";
}, Str);
