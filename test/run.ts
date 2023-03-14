import { tests as coreTests } from "./core/run.js";
import { tests as binTests } from "./bin/run.js";

export type Test = {
  test: () => void;
  module: string;
  name: string;
};

const tests = [...coreTests, ...binTests];

import chalk from "chalk";

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
