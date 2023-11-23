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
import type { ErrorSpan } from "../bin/types/Error.js";

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
        const { errors: allErrors, comments } = analyzeFile(testPath) || {
          errors: {} as Record<string, ErrorSpan[]>,
          comments: [],
        };

        const errors: (ErrorSpan & {
          expected?: true;
        })[] = allErrors[testPath];

        if (errors.length === 0) {
          throw new Error("Expected at least one error but got none");
        }

        // Ensure every comment has a matching error.
        comments.forEach((comment) => {
          if (comment.value.startsWith("/")) {
            const errorCode = comment.value.replace("/", "");
            const errorLine = (comment.loc?.start.line || -2) + 1; // The actual error is expected to occur on the next line.

            const foundError = errors.find((err) => {
              return (
                err.code === errorCode &&
                (err.loc?.start.line || -3) === errorLine
              );
            });

            if (!foundError) {
              throw new Error(
                `Missing expected error ${errorCode} on line ${errorLine}`
              );
            }

            foundError.expected = true;
          }
        });

        // Ensure every error has a matching comment.
        errors.forEach((err) => {
          if (!err.expected) {
            throw new Error(
              `Unexpected ${err.code} ${JSON.stringify(err.meta)} at ${
                err.loc?.start.line
              }:${err.loc?.start.column}`
            );
          }
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
