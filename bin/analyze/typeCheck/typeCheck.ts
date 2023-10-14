import type { ECNode } from "../../types/ECNode";

import type { Type } from "../../../core/core";

import type { Error, Warning } from "../../types/Error.js";

import { SymbolTable } from "../SymbolTable.js";

import { bindTypeCheckNode } from "./typeCheckNode.js";

export type Scope = {
  current: SymbolTable;
  errors: Error[];
  warnings: Warning[];
};

// typeCheck returns a map of exports and their types.
export const typeCheck = (
  body: ECNode[],
  path: string
): {
  exports: Record<string, Type>;
  errors: Error[];
  warnings: Warning[];
} => {
  const exports: Record<string, Type> = {};

  // Scope is used as a makeshift "pointer": it serves as a handle to `current`.
  const scope: Scope = {
    current: new SymbolTable(null),
    errors: [],
    warnings: [],
  };

  const typeCheckNode = bindTypeCheckNode({ scope, path, exports });

  body.forEach((node) => typeCheckNode(node));

  return {
    exports,
    errors: scope.errors,
    warnings: scope.warnings,
  };
};
