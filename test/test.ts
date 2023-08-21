import { readdirSync } from "node:fs";
import path from "node:path";

import chalk from "chalk";

const runtimeDir = path.join(path.dirname(process.argv[1]), "./runtime");
const staticDir = path.join(path.dirname(process.argv[1]), "./static");

// Collect tests
const tests = readdirSync(runtimeDir).flatMap((dir) => {
  const dirPath = path.join(runtimeDir, dir);

  return readdirSync(dirPath).map((file) => {
    const runtimePath = path.join(dirPath, file);

    return {
      name: `${dir}/${file}`,
      runtimePath,
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
  for (const { name, runtimePath } of tests) {
    process.stdout.write(`${name}:`.padEnd(lineLength));

    if (runtimePath.includes("-skip.js")) {
      process.stdout.write(chalk.black.bgYellowBright("SKIP") + "\n");
      continue;
    }

    let stage = "analysis";
    try {
      if (runtimePath.includes("-fail.js")) {
        // Do not run; expect static checking to fail.
        assert.throws(() => {
          analyzeFile(runtimePath);
        });
      } else {
        analyzeFile(runtimePath);

        stage = "exec";
        await import(runtimePath);
      }

      process.stdout.write(chalk.black.bgGreenBright("PASS") + "\n");
    } catch (e) {
      failed = true;
      process.stdout.write(
        `${chalk.black.bgRedBright("FAIL")} (${chalk.bold.redBright(stage)})\n`
      );
      console.log(e);
      console.log(runtimePath);
    }
  }
})();

if (failed) {
  process.exit(1);
}
