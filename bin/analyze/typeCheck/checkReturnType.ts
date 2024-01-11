import { ErrorType, type Type } from "../../../core/internal.js";
import type { ECArrowFunctionExpression } from "../../types/ECNode.js";
import type { Scope } from "./typeCheck.js";
import type { bindTypeCheckExp } from "./typeCheckExp.js";
import type { bindTypeCheckNode } from "./typeCheckNode.js";

import { SymbolTable } from "../SymbolTable.js";

export const bindCheckReturnType = ({
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
  const checkReturnType = (
    fnNode: ECArrowFunctionExpression,
    paramTypes: Record<string, Type>,
    expectedType: Type | null = null,
  ): Type => {
    // Spawn new function scope
    const originalScope = scope.current;
    scope.current = new SymbolTable(
      scope.current,
      expectedType === null
        ? { kind: "inferred", returns: null }
        : { kind: "expected", returns: expectedType },
    );

    // Load parameters into scope
    fnNode.params.forEach((param, i) => {
      if (param.type !== "ECIdentifier") {
        scope.error(
          "UNIMPLEMENTED",
          { features: "function parameters other than identifiers " },
          param,
        );
        return ErrorType;
      }

      scope.current.set(param.name, paramTypes[param.name]);
    });

    let returnType: Type;
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
        scope.error(
          "MISSING_EXPECTED",
          { syntax: "return statement " },
          lastNode,
        );
        return ErrorType;
      }

      if (
        scope.current.functionScope.kind === "inferred" &&
        scope.current.functionScope.returns === null
      ) {
        // I'm not sure how else we could be missing an inferred type besides a missing return statement.
        scope.error(
          "MISSING_EXPECTED",
          { syntax: "return statement" },
          fnNode.body,
        );
        return ErrorType;
      }

      // We know scope.current.functionScope.returns MUST be Type, it cannot be null.
      ({ returns: returnType } = scope.current.functionScope as {
        returns: Type;
      });
    } else {
      // Function returns an expression directly.
      returnType = typeCheckExp(fnNode.body).ectype;

      if (!!expectedType && !returnType.eq(expectedType)) {
        scope.error(
          "EXPECTED_RETURN_TYPE_MISMATCH",
          { received: returnType, expected: expectedType },
          fnNode.body,
        );
        return ErrorType;
      }
    }

    // Return scope to parent
    scope.current = originalScope;

    return returnType;
  };

  return checkReturnType;
};
