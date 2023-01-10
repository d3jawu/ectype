import { parseFileSync } from "@swc/core";
import { sanitize } from "./sanitize.js";
import { annotate } from "./annotate.js";

export function parseFile(path: string) {
  const { body: ast } = parseFileSync(path);

  const sanitized = sanitize(ast);
  console.log(sanitized);

  const annotated = annotate(sanitized);
}
