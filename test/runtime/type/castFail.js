"use ectype";
import { MaybeStaticTest, TestConfig } from "../../lib/TestConfig.js";
const config = TestConfig.from({
  staticTest: MaybeStaticTest.of({ None: null }),
  analysisFails: true,
});
export { config };

  import { Type } from "../../../core/primitives.js";

// Can't cast a value to a type.
const A = Type.from(10);
