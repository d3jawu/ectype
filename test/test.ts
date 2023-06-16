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
import type { StaticTest } from "./static/StaticTest.js";

let failed = false;

type Stage = "setup" | "exec" | "analysis" | "static test";

await (async () => {
  for (const { name, runtimePath, staticPath } of tests) {
    process.stdout.write(`${name}:`.padEnd(lineLength));

    let stage: Stage = "setup";
    try {
      let config: StaticTest = {
        exec: true,
        analysisThrows: false,
      };

      if (existsSync(staticPath)) {
        const { config: overrideConfig } = await import(staticPath);
        config = {
          ...config,
          ...overrideConfig,
        };
      }

      if (config.exec) {
        stage = "exec";
        await import(runtimePath);
      }

      stage = "analysis";
      if (config.analysisThrows) {
        assert.throws(() => {
          analyzeFile(runtimePath);
        });
      } else {
        const staticExports = analyzeFile(runtimePath);

        if (!!config.staticTest && staticExports !== null) {
          stage = "static test";
          config.staticTest(staticExports);
        }
      }

      process.stdout.write(chalk.black.bgGreenBright("PASS") + "\n");
    } catch (e) {
      failed = true;
      process.stdout.write(
        `${chalk.black.bgRedBright("FAIL")} (${chalk.bold.redBright(stage)})\n`
      );
      console.log(e);
    }
  }
})();

if (failed) {
  process.exit(1);
}
