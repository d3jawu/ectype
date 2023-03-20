import * as typeCheckTests from "./tests/typeCheck.js";

const imports = { typeCheckTests };

import type { Test } from "../run.js";

const tests: Test[] = Object.entries(imports).flatMap(([module, tests]) =>
  Object.entries(tests).map(([name, test]) => ({
    module,
    name,
    test,
  }))
);

import { parseSync } from "@swc/core";
import { lower } from "../../bin/analyze/lower.js";
import { typeCheck } from "../../bin/analyze/typeCheck.js";
import { Type } from "../../core/types.js";

const analyze = (src: string): Record<string, Type> => {
  const { body: ast } = parseSync(src);
  const lowered = lower(ast);
  return typeCheck(lowered);
};

export { tests, analyze };
