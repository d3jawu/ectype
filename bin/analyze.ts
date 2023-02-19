import { resolve } from "node:path";
import { parseFileSync } from "@swc/core";
import { analyze } from "./analyze/analyze.js";

if (!process.argv[2]) {
  throw new Error("No entry point specified.");
}

const entryPoint = resolve(process.argv[2]);
const { body: ast } = parseFileSync(entryPoint);
analyze(ast);
