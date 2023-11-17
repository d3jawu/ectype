import type { Node } from "acorn";
import type { Type } from "../../../core/core";
import type { ECNode } from "../../types/ECNode.js";

import { ErrorMeta, ErrorSpan } from "../../types/Error.js";

import { SymbolTable } from "../SymbolTable.js";

import { bindTypeCheckNode } from "./typeCheckNode.js";

type ErrorMap = Record<string, ErrorSpan[]>;

export type Scope = {
  current: SymbolTable;
  error: <Code extends keyof ErrorMeta>(
    code: Code,
    meta: ErrorMeta[Code],
    node: Node,
    remark?: string
  ) => void;
  importErrors: (errs: ErrorMap) => void;
};

// typeCheck returns a map of exports and their types.
export const typeCheck = (
  body: ECNode[],
  path: string
): {
  exports: Record<string, Type>;
  errors: ErrorMap;
} => {
  const exports: Record<string, Type> = {};

  // For the record, I hate this solution and I'm looking for a better one.
  let errors: ErrorMap = {};
  errors[path] = [];

  // Scope is used as a makeshift "pointer": it serves as a handle to `current`.
  const scope: Scope = {
    current: new SymbolTable(null),
    error: (code, meta, node, remark = "") => {
      errors[path].push({
        code,
        meta,
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
  };

  const typeCheckNode = bindTypeCheckNode({ scope, path, exports });

  body.forEach((node) => typeCheckNode(node));

  return {
    exports,
    errors,
  };
};
