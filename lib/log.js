"use ectype";

import { Null, Str, fn, js } from "../core/core.js";

const log = js(
  () => {
    return console.log;
  },
  fn([Str], Null),
);

export { log };
