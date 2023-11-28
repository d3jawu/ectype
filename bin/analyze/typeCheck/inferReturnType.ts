import type { Type } from "../../../core/internal.js";
import type { ECArrowFunctionExpression } from "../../types/ECNode.js";
import type { Scope } from "./typeCheck.js";
import type { bindTypeCheckExp } from "./typeCheckExp.js";
import type { bindTypeCheckNode } from "./typeCheckNode.js";

import { SymbolTable } from "../SymbolTable.js";

export const bindInferReturnType = ({
  typeCheckExp,
  typeCheckNode,
  scope,
}: {
  scope: Scope;
  // These methods should also be bound to `scope`.
  typeCheckExp: ReturnType<typeof bindTypeCheckExp>;
  typeCheckNode: ReturnType<typeof bindTypeCheckNode>;
}) => {
  // Visits (and type-checks) a function node and infers i return type.
  // Handles its own scope creation.
  const inferReturnType = (
    fnNode: ECArrowFunctionExpression,
    paramTypes: Record<string, Type>,
  ): Type => {
    // Spawn new function scope
    const originalScope = scope.current;
    scope.current = new SymbolTable(scope.current, true);

    // Load parameters into scope
    fnNode.params.forEach((param, i) => {
      if (param.type !== "ECIdentifier") {
        throw new Error(
          `Function parameters other than identifiers are not yet implemented (got ${param.type})`,
        );
      }

      scope.current.set(param.name, paramTypes[param.name]);
    });

    let inferredType: Type;
    if (fnNode.body.type === "ECBlockStatement") {
      typeCheckNode(fnNode.body);

      const statements = fnNode.body.body;
      if (statements.length === 0) {
        throw new Error(
          `Function body cannot be empty (it must return a value).`,
        );
      }

      // Check for missing return at end of body
      const lastNode = statements[statements.length - 1];
      if (lastNode.type !== "ECReturnStatement") {
        throw new Error(`Function must explicitly return.`);
      }

      if (scope.current.inferredReturnType === null) {
        throw new Error(
          `Could not infer a type. Is the function missing a return statement?`,
        );
      }

      inferredType = scope.current.inferredReturnType;
    } else {
      // Function returns an expression directly.
      inferredType = typeCheckExp(fnNode.body).ectype;
    }

    // Return scope to parent
    scope.current = originalScope;

    return inferredType;
  };

  return inferReturnType;
};
