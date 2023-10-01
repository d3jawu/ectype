import type { Type } from "../../core/core";

export class SymbolTable {
  parent: SymbolTable | null;
  values: Record<string, Type>;
  functionScope: boolean;
  inferredReturnType: Type | null; // Catalogues types seen while visiting this function.

  constructor(parent: SymbolTable | null, functionScope = false) {
    this.parent = parent;
    this.values = {};
    this.functionScope = functionScope;
    this.inferredReturnType = null;
  }

  get(name: string): Type | null {
    if (name in this.values) {
      return this.values[name];
    } else if (this.parent !== null) {
      return this.parent.get(name);
    } else {
      return null;
    }
  }

  set(name: string, type: Type) {
    if (name in this.values) {
      throw new Error(`${name} is already defined in this immediate scope.`);
    }

    this.values[name] = type;
  }
}
