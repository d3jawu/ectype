"use ectype";
import { Str } from "../../../core/primitives.js";
import { js } from "../../../core/js.js";

let x = "asdf";

x = js(() => {
  return "abcd";
}, Str);
