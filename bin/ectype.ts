#!/usr/bin/env node

import { dirname, relative, resolve } from "node:path";
import { analyzeFile } from "./analyze/analyzeFile.js";

import chalk from "chalk";
import { readFileSync } from "node:fs";

if (!process.argv[2] || process.argv[2] !== "check") {
  console.log(`Usage: ectype check entrypoint.js`);
  process.exit(1);
}

if (!process.argv[3]) {
  console.log(`Entrypoint not specified.`);
  process.exit(1);
}

const entryPoint = resolve(process.argv[3]);

try {
  const res = analyzeFile(entryPoint);
  if (res === null) {
    console.log(`Warning: entrypoint ${entryPoint} is not an Ectype file.`);
    process.exit(1);
  }

  const { errors, warnings } = res;

  let errored = false;
  Object.entries(errors).forEach(([path, errors]) => {
    if (errors.length === 0) {
      return;
    }

    errored = true;

    const file = readFileSync(path).toString();

    // Color all errors in file.
    let coloredFile = "";
    errors.forEach(({ start, end }, i) => {
      const prevSpanEnd = errors[i - 1]?.end || 0;

      coloredFile +=
        file.substring(prevSpanEnd, start) +
        chalk.red(file.substring(start, end));
    });

    const lines = coloredFile.split("\n");

    errors.forEach(({ loc, message }) => {
      if (!loc) {
        console.log(`Location information missing for error.`);
        return;
      }

      const { start, end } = loc;

      console.log(
        `${chalk.bgBlueBright(
          relative(dirname(entryPoint), path)
        )} ${chalk.bgRedBright.black("ERROR")} ${chalk.bgYellow(
          `${start.line}:${start.column}`
        )} ${chalk.bgWhite.black(message)}\n`
      );

      // i is the line number, which is 1-indexed.
      for (let i = start.line; i <= end.line; i += 1) {
        console.log(
          `${chalk.bgGray.black(
            i.toString().padStart(end.line.toString().length)
          )} ${lines[i - 1]}`
        );
      }

      console.log();
    });
  });

  if (errored) {
    process.exit(1);
  }
} catch (e: any) {
  console.log(`Error: ${e.message}`);
  process.exit(1);
}
