import * as typeCheck from "./tests/typeCheck.js";

const imports = { typeCheck };

import type { Test } from "../run.js";

const tests: Test[] = Object.entries(imports).flatMap(([module, tests]) =>
  Object.entries(tests).map(([name, test]) => ({
    module,
    name,
    test,
  }))
);

import { parseSync } from "@swc/core";
import { analyze as analyzeAST } from "../../bin/analyze/analyze.js";

const analyze = (src: string) => {
  const { body: ast } = parseSync(src);
  analyzeAST(ast);
};

export { tests, analyze };
