import { parseFileSync } from "@swc/core";
import { lower } from "./lower.js";
import { typeCheck, typeValFrom } from "./typeCheck.js";

import type { Type } from "../../core/types.js";
import * as primitives from "../../core/primitives.js";

const primitiveTypeVals = Object.entries(primitives).reduce(
  (acc: Record<string, Type>, [k, v]) => {
    acc[k] = typeValFrom(v);
    return acc;
  },
  {}
);

// Parses, lowers, and type-checks a file and returns a map of its exports.
export const analyzeFile = (path: string): Record<string, Type> => {
  const { body: ast } = parseFileSync(path);

  // Special-case handling for ectype library files.
  if (
    ast.length > 0 &&
    ast[0].type === "ExpressionStatement" &&
    ast[0].expression.type === "StringLiteral" &&
    ast[0].expression.value.startsWith("ectype")
  ) {
    const suffix = ast[0].expression.value.split(":")[1];

    if (suffix === "primitives") {
      return primitiveTypeVals;
    }

    return {
      [suffix]: primitives.Void,
    };
  }

  const lowered = lower(ast);
  return typeCheck(lowered, path);
};
