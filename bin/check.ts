#!/usr/bin/env node

import { resolve } from "node:path";
import { analyzeFile } from "./analyze/analyzeFile.js";

if (!process.argv[2]) {
  throw new Error("No entry point specified.");
}

const entryPoint = resolve(process.argv[2]);
analyzeFile(entryPoint);
