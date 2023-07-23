"use ectype";

import { MaybeStaticTest, TestConfig } from "../../lib/TestConfig.js";
import { ok } from "../../lib/assert.js";
const config = TestConfig.from({
  staticTest: MaybeStaticTest.of({
    Some: fn([Unknown], Null).from((exports) =>
      js(() => {
        const StrArrayType = exports["StrArray"];

        ok(StrArrayType !== null);
        ok(StrArrayType.baseType === "type");
        const StrArray = StrArrayType.type();
        ok(StrArray.baseType === "array");
        ok(StrArray.contains().baseType === "str");
      })
    ),
  }),
  analysisFails: false,
});
export { config };

import { array } from "../../../core/array.js";
import { fn } from "../../../core/fn.js";
import { js } from "../../../core/js.js";
import { Null, Str, Unknown } from "../../../core/primitives.js";

const StrArray = array(Str);

export { StrArray };
