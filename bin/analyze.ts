import { resolve } from "node:path";
import { parseFile } from "./analyze/parseFile.js";

if (!process.argv[2]) {
  throw new Error("No entry point specified.");
}

const entryPoint = resolve(process.argv[2]);
parseFile(entryPoint);
