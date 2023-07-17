"use ectype";

import { fn } from "../core/fn.js";

import { Null, Unknown } from "../core/primitives.js";

import { js } from "../core/js.js";

const log = js(() => {
  return console.log;
}, fn([Unknown], Null));

export { log };
