import type { ECNode } from "../../types/ECNode";

import { Type } from "../../../core/types.js";

import { SymbolTable } from "../SymbolTable.js";

import { bindTypeCheckNode } from "./typeCheckNode.js";

export type Scope = {
  current: SymbolTable;
};

// typeCheck returns a map of exports and their types.
export const typeCheck = (
  body: ECNode[],
  path: string
): Record<string, Type> => {
  const exports: Record<string, Type> = {};

  // Scope is used as a makeshift "pointer": it serves as a handle to `current`.
  const scope: Scope = {
    current: new SymbolTable(null),
  };

  const typeCheckNode = bindTypeCheckNode({ scope, path, exports });

  body.forEach((node) => typeCheckNode(node));

  return exports;
};
