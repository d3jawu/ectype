#!/usr/bin/env node

import { dirname, relative, resolve } from "node:path";
import { analyzeFile } from "./analyze/analyzeFile.js";

import { Span } from "@swc/core";
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

const spanToPos = (span: Span, sourceCode: string) => {
  // Span seems to start at 1, subtract to offset this.
  const startOffset = Math.min(span.start, sourceCode.length) - 1;
  const endOffset = Math.min(span.end, sourceCode.length) - 1;

  let startLine = 1;
  let startColumn = 1;
  let endLine = 1;
  let endColumn = 1;

  for (let i = 0; i < startOffset; i++) {
    if (sourceCode[i] === "\n") {
      startLine++;
      startColumn = 1;
    } else {
      startColumn++;
    }
  }

  for (let i = 0; i < endOffset; i++) {
    if (sourceCode[i] === "\n") {
      endLine++;
      endColumn = 1;
    } else {
      endColumn++;
    }
  }

  return {
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn },
  };
};

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
    errors.forEach(({ span }, i) => {
      const prevSpanEnd = errors[i - 1]?.span?.end || 0;
      // Subtract to offset 1-indexed span
      const start = span.start - 1;
      const end = span.end - 1;

      coloredFile +=
        file.substring(prevSpanEnd, start) +
        chalk.red(file.substring(start, end));
    });

    const lines = coloredFile.split("\n");

    errors.forEach(({ span, message }) => {
      const { start, end } = spanToPos(span, file);

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
