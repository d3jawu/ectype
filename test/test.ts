import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

import chalk from "chalk";

const runtimeDir = path.join(path.dirname(process.argv[1]), "./runtime");
const staticDir = path.join(path.dirname(process.argv[1]), "./static");

// Collect tests
const tests = readdirSync(runtimeDir).flatMap((dir) => {
  const dirPath = path.join(runtimeDir, dir);

  return readdirSync(dirPath).map((file) => {
    const runtimePath = path.join(dirPath, file);
    const staticPath = path.join(path.join(staticDir, dir, file));

    return {
      name: `${dir}/${file}`,
      runtimePath,
      staticPath,
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

// Run
await (async () => {
  for (const { name, runtimePath, staticPath } of tests) {
    process.stdout.write(`${name}:`.padEnd(lineLength));

    try {
      let exec = true;
      let throws = false;
      let staticTest;
      if (existsSync(staticPath)) {
        ({
          test: { exec = true, throws = false, staticTest },
        } = await import(staticPath));
      }

      if (exec) {
        await import(runtimePath);
      }

      if (!!staticTest || throws) {
        if (throws) {
          assert.throws(() => {
            analyzeFile(runtimePath);
          });
        } else {
          const staticExports = analyzeFile(runtimePath);
          staticTest(staticExports);
        }
      }

      process.stdout.write(chalk.black.bgGreenBright("PASS") + "\n");
    } catch (e) {
      failed = true;
      process.stdout.write(chalk.black.bgRedBright("FAIL") + "\n");
      console.log(e);
    }
  }
})();

if (failed) {
  process.exit(1);
}
