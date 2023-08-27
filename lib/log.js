"use ectype";

import { Null, Unknown, fn, js } from "../core/core.js";

const log = js(() => {
  return console.log;
}, fn([Unknown], Null));

export { log };
