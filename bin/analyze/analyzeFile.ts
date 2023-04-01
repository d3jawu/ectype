import { parseFileSync } from "@swc/core";
import type { ModuleItem } from "@swc/core";
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

const readStringNode = (node: ModuleItem): string => {
  if (
    node.type === "ExpressionStatement" &&
    node.expression.type === "StringLiteral"
  ) {
    return node.expression.value;
  }

  return "";
};

// Parses, lowers, and type-checks a file and returns a map of its exports.
export const analyzeFile = (path: string): Record<string, Type> => {
  const { body: ast } = parseFileSync(path);

  if (
    ast.length === 0 ||
    ast[0].type !== "ExpressionStatement" ||
    ast[0].expression.type !== "StringLiteral"
  ) {
    return {};
  }

  let initialString: string;

  // If the file opens with "use strict", check just the next statement.
  // Ectype will not check the whole file for an 'ectype' directive.
  if (ast[0].expression.value === "use strict") {
    if (
      ast.length === 1 ||
      ast[1].type !== "ExpressionStatement" ||
      ast[1].expression.type !== "StringLiteral"
    ) {
      return {};
    }

    initialString = ast[1].expression.value;
  } else {
    initialString = ast[0].expression.value;
  }

  if (initialString.startsWith("ectype")) {
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
  return {};
};
