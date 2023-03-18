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
import { SymbolTable } from "../../bin/analyze/typeCheck.js";
import { lower } from "../../bin/analyze/lower.js";
import { typeCheck } from "../../bin/analyze/typeCheck.js";

const analyze = (src: string): SymbolTable => {
  const { body: ast } = parseSync(src);
  const lowered = lower(ast);
  return typeCheck(lowered);
};

export { tests, analyze };
