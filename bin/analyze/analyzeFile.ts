import { parseFileSync } from "@swc/core";
import { lower } from "./lower.js";
import { typeCheck, typeValFrom } from "./typeCheck.js";

import * as primitives from "../../core/primitives.js";
import type { Type } from "../../core/types.js";

const primitiveTypeVals = Object.entries(primitives).reduce(
  (acc: Record<string, Type>, [k, v]) => {
    acc[k] = typeValFrom(v);
    return acc;
  },
  {}
);

// If the file at path is an Ectype file, analyzeFile parses, lowers, and type-checks it, returning a record of the types of its exports.
// If it is not, null is returned.
export const analyzeFile = (path: string): Record<string, Type> | null => {
  // Don't analyze Node built-in modules.
  if (path.includes("node:")) {
    return null;
  }

  const { body: ast } = parseFileSync(path);

  // If file doesn't begin with a string, it can't be an Ectype file (no directive).
  if (
    ast.length === 0 ||
    ast[0].type !== "ExpressionStatement" ||
    ast[0].expression.type !== "StringLiteral"
  ) {
    return null;
  }

  let initialString: string;

  // If the file opens with "use strict", check just the next statement.
  // Ectype will not check the whole file for a directive.
  if (ast[0].expression.value === "use strict") {
    if (
      ast.length === 1 ||
      ast[1].type !== "ExpressionStatement" ||
      ast[1].expression.type !== "StringLiteral"
    ) {
      return null;
    }

    initialString = ast[1].expression.value;
  } else {
    initialString = ast[0].expression.value;
  }

  // Ectype library file
  if (initialString.startsWith("ectype:")) {
    const suffix = ast[0].expression.value.split(":")[1];

    if (suffix === "primitives") {
      return primitiveTypeVals;
    }

    return {
      [suffix]: primitives.Void,
    };
  }

  // Only type-check a file if it is declared as an ectype file.
  if (initialString === "use ectype") {
    const lowered = lower(ast);
    return typeCheck(lowered, path);
  }

  // If we get here, the file had some other unused string literal sitting in top-level scope for some reason
  return null;
};
