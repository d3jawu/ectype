import type { Type } from "../../core/core";

export class SymbolTable {
  parent: SymbolTable | null;
  values: Record<string, Type>;
  returnType: Type | null; // null if not a function scope.

  constructor(parent: SymbolTable | null, returnType: Type | null = null) {
    this.parent = parent;
    this.values = {};
    this.returnType = returnType;
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
