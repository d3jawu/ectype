import { readdirSync } from "node:fs";
import path from "node:path";

import chalk from "chalk";

const testDir = path.join(path.dirname(process.argv[1]), "./cases");

// Collect tests
const tests = readdirSync(testDir).flatMap((dir) => {
  const dirPath = path.join(testDir, dir);

  return readdirSync(dirPath).map((file) => {
    const testPath = path.join(dirPath, file);

    return {
      name: `${dir}/${file}`,
      testPath,
    };
  });
});

const lineLength =
  tests.reduce((acc, { name }) => {
    if (name.length > acc) {
      return name.length;
    } else {
      return acc;
    }
  }, 0) + 2;

import { analyzeFile } from "../bin/analyze/analyzeFile.js";

import { strict as assert } from "node:assert";

let failed = false;

type Stage = "exec" | "analysis";

// Run tests
await (async () => {
  for (const { name, testPath } of tests) {
    process.stdout.write(`${name}:`.padEnd(lineLength));

    if (testPath.includes("-skip.js")) {
      process.stdout.write(chalk.black.bgYellowBright("SKIP") + "\n");
      continue;
    }

    let stage: Stage = "analysis";
    try {
      if (testPath.includes("-fail.js")) {
        // Do not run; expect static checking to fail.
        assert.throws(() => {
          analyzeFile(testPath);
        });
      } else {
        analyzeFile(testPath);

        stage = "exec";
        await import(testPath);
      }

      process.stdout.write(chalk.black.bgGreenBright("PASS") + "\n");
    } catch (e) {
      failed = true;
      process.stdout.write(
        `${chalk.black.bgRedBright("FAIL")} (${chalk.bold.redBright(stage)})\n`
      );
      console.log(e);
      console.log(testPath);
    }
  }
})();

if (failed) {
  process.exit(1);
}
