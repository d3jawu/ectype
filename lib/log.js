"use ectype";

import { fn } from "../core/fn.js";

import { Null, Str } from "../core/primitives.js";

import { js } from "../core/js.js";

const log = js(() => {
  return console.log;
}, fn([Str], Null));

export { log };
