"use ectype";

// TestConfig defines the type for the test configuration object at the beginning of each test.
// The test config object is read by the test runner and used to modify the behavior of the test.

import { fn } from "../../core/fn.js";
import { Bool, Null, Unknown } from "../../core/primitives.js";
import { struct } from "../../core/struct.js";
import { variant } from "../../core/variant.js";

const MaybeStaticTest = variant({
  Some: fn([Unknown], Null), // TODO replace Unknown with ObjectMap when that is ready
  None: Null,
});

const TestConfig = struct({
  // define a custom static analysis test. types of exported values are available in the parameter.
  staticTest: MaybeStaticTest,
  // Set true if static analysis is expected to fail. staticTest will not be run.
  analysisFails: Bool,
});

export { MaybeStaticTest, TestConfig };
