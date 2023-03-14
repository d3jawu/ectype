import * as fn from "./tests/fn.js";
import * as variants from "./tests/variants.js";
import * as tuple from "./tests/tuple.js";
import * as array from "./tests/array.js";
import * as structs from "./tests/structs.js";

const imports = { fn, variants, tuple, array, structs };

import type { Test } from "../run.js";

const tests: Test[] = Object.entries(imports).flatMap(([module, tests]) =>
  Object.entries(tests).map(([name, test]) => ({
    module,
    name,
    test,
  }))
);

export { tests };
