import * as variants from "./tests/variants.js";
import * as structs from "./tests/structs.js";
import * as fn from "./tests/fn.js";
const imports = { variants, structs, fn };

import chalk from "chalk";

const tests = Object.entries(imports).flatMap(([module, tests]) =>
  Object.entries(tests).map(([name, test]) => ({
    module,
    name,
    test,
  }))
);

const testName = (module: string, name: string) => `${module}.${name}`;

const lineLength =
  tests.reduce((acc, { module, name }) => {
    if (testName(module, name).length > acc) {
      return testName(module, name).length;
    } else {
      return acc;
    }
  }, 0) + 2;
const failed = tests.filter(({ module, name, test }) => {
  process.stdout.write(`${testName(module, name)}:`.padEnd(lineLength));

  try {
    test();
    process.stdout.write(chalk.black.bgGreenBright("PASS") + "\n");
    return false;
  } catch (e) {
    process.stdout.write(chalk.black.bgRedBright("FAIL") + "\n");
    console.log(e);
    return true;
  }
});

if (failed.length !== 0) {
  process.exit(1);
}
