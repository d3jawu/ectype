import { parseFileSync } from "@swc/core";
import { sanitize } from "./sanitize.js";

export function parseFile(path: string) {
  const { body: ast } = parseFileSync(path);

  sanitize(ast);
}
