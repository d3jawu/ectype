import type { Type } from "../../core/core";
import { ErrorType } from "../../core/internal.js";

export class SymbolTable {
  parent: SymbolTable | null;
  values: Record<string, Type>;

  // Used to store the return type seen while visiting a function.
  functionScope:
    | { kind: "none" } // Not a function scope.
    | { kind: "inferred"; returns: Type | null } // A function scope where a return type needs to be inferred.
    | { kind: "expected"; returns: Type }; // A function scope where a return type is expected and should be checked against.

  constructor(
    parent: SymbolTable | null,
    returnType: SymbolTable["functionScope"] = { kind: "none" },
  ) {
    this.parent = parent;
    this.values = {};
    this.functionScope = returnType;
  }

  get(name: string): Type {
    if (name in this.values) {
      return this.values[name];
    } else if (this.parent !== null) {
      return this.parent.get(name);
    } else {
      return ErrorType;
    }
  }

  set(name: string, type: Type) {
    if (name in this.values) {
      throw new Error(`${name} is already defined in this immediate scope.`);
    }

    this.values[name] = type;
  }
}
