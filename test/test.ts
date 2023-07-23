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
import type { Type } from "../core/types.js";
import { MaybeStaticTest } from "./lib/TestConfig.js";

let failed = false;

type Stage = "setup" | "exec" | "analysis" | "static test";

await (async () => {
  for (const { name, runtimePath, staticPath } of tests) {
    process.stdout.write(`${name}:`.padEnd(lineLength));

    let stage: Stage = "setup";
    try {
      stage = "exec";
      const { config: testConfig } = await import(runtimePath);
      const config = !!testConfig
        ? testConfig
        : {
            staticTest: MaybeStaticTest.of({ None: null }),
            analysisThrows: false,
          };

      stage = "analysis";
      if (config.analysisFails) {
        assert.throws(() => {
          analyzeFile(runtimePath);
        });
      } else {
        const staticExports = analyzeFile(runtimePath);

        // Yeah, this is cheating. If this were an actual Ectype file, these functions would require types.
        config.staticTest.when({
          Some: (testFn: (staticExports: Record<string, Type>) => void) => {
            stage = "static test";
            testFn(staticExports || {});
          },
          None: () => {},
        });
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
