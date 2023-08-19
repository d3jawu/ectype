"use ectype";
import { MaybeStaticTest, TestConfig } from "../../lib/TestConfig.js";
const config = TestConfig.from({
  staticTest: MaybeStaticTest.of({ None: null }),
  analysisFails: true,
});
export { config };

import { fn } from "../../../core/fn.js";
import { Null, Str } from "../../../core/primitives.js";
import { variant } from "../../../core/variant.js";

const MaybeStr = variant({
  Some: Str,
  None: Null,
});

const someStr = MaybeStr.of({ Some: "abc" });

someStr.when({
  Some: fn([Str], Null).from((s) => {
    return null;
  }),
});
