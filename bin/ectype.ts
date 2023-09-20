#!/usr/bin/env node

import { resolve } from "node:path";
import { analyzeFile } from "./analyze/analyzeFile.js";

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
  }
} catch (e: any) {
  console.log(`Error: ${e.message}`);
  process.exit(1);
}
