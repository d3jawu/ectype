import type { ECNode } from "../../types/ECNode";

import type { Type } from "../../../core/core";

import type { Error, Warning } from "../../types/Error.js";

import { SymbolTable } from "../SymbolTable.js";

import { Node } from "acorn";
import { bindTypeCheckNode } from "./typeCheckNode.js";

type ErrorMap = Record<string, Error[]>;
type WarningMap = Record<string, Warning[]>;

export type Scope = {
  current: SymbolTable;
  error: (err: Omit<Error, "start" | "end" | "loc">, node: Node) => void;
  importErrors: (errs: ErrorMap) => void;
  warning: (warn: Omit<Warning, "start" | "end" | "loc">, node: Node) => void;
  importWarnings: (warns: WarningMap) => void;
};

// typeCheck returns a map of exports and their types.
export const typeCheck = (
  body: ECNode[],
  path: string
): {
  exports: Record<string, Type>;
  errors: ErrorMap;
  warnings: WarningMap;
} => {
  const exports: Record<string, Type> = {};

  // For the record, I hate this solution and I'm looking for a better one.
  let errors: ErrorMap = {};
  errors[path] = [];
  let warnings: WarningMap = {};
  warnings[path] = [];

  // Scope is used as a makeshift "pointer": it serves as a handle to `current`.
  const scope: Scope = {
    current: new SymbolTable(null),
    error: (err, node) => {
      errors[path].push({
        ...err,
        start: node.start,
        end: node.end,
        loc: node.loc || undefined,
      });
    },
    importErrors: (incoming) => {
      // Merge order *shouldn't* matter because a file should have the same errors each time.
      errors = {
        ...errors,
        ...incoming,
      };
    },
    warning: (warn, node) => {
      warnings[path].push({
        ...warn,
        start: node.start,
        end: node.end,
        loc: node.loc || undefined,
      });
    },
    importWarnings: (incoming) => {
      warnings = {
        ...warnings,
        ...incoming,
      };
    },
  };

  const typeCheckNode = bindTypeCheckNode({ scope, path, exports });

  body.forEach((node) => typeCheckNode(node));

  return {
    exports,
    errors,
    warnings,
  };
};
