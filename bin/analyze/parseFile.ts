import { parseFileSync } from "@swc/core";
import { resolve } from "node:path";
import { sanitize } from "./sanitize.js";

export function parseFile(path: string) {
  const { body: ast } = parseFileSync(path);

  sanitize(ast);
}
