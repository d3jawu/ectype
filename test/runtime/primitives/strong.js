"use ectype";

import { MaybeStaticTest, TestConfig } from "../../lib/TestConfig.js";
const config = TestConfig.from({
  staticTest: MaybeStaticTest.of({ None: null }),
  analysisFails: true,
});
export { config };

let n = 10;
n = "abc";
