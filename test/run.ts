import * as variants from "./tests/variants.js";
import * as structs from "./tests/structs.js";
const imports = [variants, structs];

import chalk from "chalk";

const tests = imports.flatMap((i) => Object.values(i));
const lineLength =
  tests.reduce((acc, test) => {
    if (test.name.length > acc) {
      return test.name.length;
    } else {
      return acc;
    }
  }, 0) + 2;
const failed = tests.filter((test) => {
  process.stdout.write((test.name + ": ").padEnd(lineLength));

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
