import type { Type } from "../../core/core.js";

import { lower } from "./lower.js";
import { typeCheck } from "./typeCheck/typeCheck.js";
import { typeValFrom } from "./typeValFrom.js";

import * as core from "../../core/core.js";
import { keyword } from "../../core/internal.js";

import type { ErrorSpan } from "../types/Error.js";

import { Comment, parse } from "acorn";

import { readFileSync } from "fs";

// Core type map, used for introducing Ectype core types into a scope.
export const coreTypeMap = Object.entries(core).reduce(
  (a: Record<string, Type>, [k, v]) => {
    if (
      k.charAt(0) === k.charAt(0).toUpperCase() &&
      typeof v !== "function" // For TypeScript's sake
    ) {
      // For concrete types, generate a type value.
      a[k] = typeValFrom(v);
    } else {
      // For type factory functions, mark them as keywords.
      a[k] = typeValFrom(keyword(k));
    }

    return a;
  },
  {}
);

// If the file at path is an Ectype file, analyzeFile parses, lowers, and type-checks
// it, returning its exports and any errors and warnings encountered. If it is
// not an Ectype file, null is returned.
export const analyzeFile = (
  path: string
): {
  exports: Record<string, Type>;
  errors: Record<string, ErrorSpan[]>;
  comments: Comment[];
} | null => {
  // Don't analyze Node built-in modules.
  if (path.includes("node:")) {
    return null;
  }

  const comments: Comment[] = [];

  const source = readFileSync(path).toString();

  const { body: ast } = parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    onComment: comments,
    locations: true,
  });

  // If file doesn't begin with a string, it can't be an Ectype file (no directive).
  if (
    ast.length === 0 ||
    ast[0].type !== "ExpressionStatement" ||
    !ast[0].directive
  ) {
    return null;
  }

  let initialString: string;

  // If the file opens with "use strict", check just the next statement.
  // Ectype will not check the whole file for a directive.
  if (ast[0].directive === "use strict") {
    if (
      ast.length === 1 ||
      ast[1].type !== "ExpressionStatement" ||
      !ast[1].directive
    ) {
      return null;
    }

    initialString = ast[1].directive;
  } else {
    initialString = ast[0].directive;
  }

  // Ectype library file, imported directly. This is an edge case, usually the
  // user will import the "ectype" package instead of importing directly from
  // a file within the package.
  if (initialString === "ectype:core") {
    return {
      exports: coreTypeMap,
      errors: {},
      comments,
    };
  }

  // Only type-check a file if it is declared as an ectype file.
  if (initialString === "use ectype") {
    const lowered = (() => {
      try {
        return lower(ast);
      } catch (e) {
        if (e !== null && typeof e === "object" && "code" in e) {
          return e as ErrorSpan;
        }

        throw e;
      }
    })();

    if ("code" in lowered) {
      return {
        exports: {},
        errors: {
          [path]: [lowered],
        },
        comments,
      };
    }

    return {
      ...typeCheck(lowered, path),
      comments,
    };
  }

  // If we get here, the file had some other unused string literal sitting in
  // top-level scope for some reason.
  return null;
};
