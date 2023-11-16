import type {
  ECAssignmentExpression,
  ECBinaryOperator,
  ECCallExpression,
  ECExp,
  ECIdentifier,
  ECJSCall,
  ECNode,
  ECTypeDeclaration,
  ECTypeMethodCall,
  ECUnaryOperator,
} from "../../types/ECNode";

import type { Type } from "../../../core/core.js";
import type { Typed, TypedExp } from "../../types/Typed";

import type { Scope } from "./typeCheck";

import {
  Bool,
  Null,
  Num,
  Str,
  Type as TypeType,
  Unknown,
  fn,
} from "../../../core/core.js";

import { Deferred, ErrorType } from "../../../core/internal.js";

import { bindParseTypeDeclaration } from "./parseTypeDeclaration.js";
import { bindParseTypeMethodCall } from "./parseTypeMethodCall.js";

import { typeValFrom } from "../typeValFrom.js";

import { match } from "ts-pattern";

export const bindTypeCheckExp = ({
  scope,
  typeCheckNode,
}: {
  scope: Scope;
  typeCheckNode: (node: ECNode) => void; // typeCheckExp expects typeCheckNode to be bound to the same scope.
}) => {
  const typeCheckExp = (node: ECExp): TypedExp =>
    match<ECExp, TypedExp>(node)
      // TODO BigInt needs its own type.
      .with({ type: "ECNullLiteral" }, (node) => ({ ...node, ectype: Null }))
      .with({ type: "ECBooleanLiteral" }, (node) => ({ ...node, ectype: Bool }))
      .with({ type: "ECNumberLiteral" }, (node) => ({ ...node, ectype: Num }))
      .with({ type: "ECStringLiteral" }, (node) => ({ ...node, ectype: Str }))
      .with({ type: "ECBigIntLiteral" }, (node) => ({ ...node, ectype: Num }))
      .with({ type: "ECIdentifier" }, (node) => {
        const type = scope.current.get(node.name);

        if (type.baseType === "error") {
          scope.error(
            {
              code: "UNDEFINED_VARIABLE",
              message: `${node.name} is not defined.`,
            },
            node
          );
        }

        return {
          ...node,
          ectype: type,
        };
      })
      .with(
        { type: "ECAssignmentExpression" },
        (node): Typed<ECAssignmentExpression> => {
          if (node.left.type !== "ECIdentifier") {
            scope.error(
              {
                code: "UNIMPLEMENTED",
                message: "Pattern assignments are not yet supported.",
              },
              node.left
            );

            return {
              ...node,
              // Just pretend it was an identifier, to avoid having to check the whole pattern.
              // This will go away once pattern support is implemented.
              left: {
                ...node.left,
                type: "ECIdentifier",
                name: "Error",
                ectype: ErrorType,
              },
              right: typeCheckExp(node.right),
              ectype: ErrorType,
            };
          }

          const lhs = typeCheckExp(node.left);
          const leftType = lhs.ectype;
          const rhs = typeCheckExp(node.right);
          const rightType = rhs.ectype;

          let ectype: Type;
          if (leftType.baseType === "error" && rightType.baseType === "error") {
            // If both sides have error types, we have no choice but to return an error type for this node.
            ectype = ErrorType;
          } else if (leftType.baseType === "error") {
            ectype = rightType;
          } else if (rightType.baseType === "error") {
            ectype = leftType;
          } else {
            if (!rightType.eq(leftType)) {
              scope.error(
                {
                  code: "TYPE_MISMATCH",
                  message: `Got ${rightType} but variable ${node.left.name} has type ${leftType}.`,
                },
                node.right
              );
            }
            // If the types don't match, use the RHS (since that's what the exp evaluates to).
            ectype = rightType;
          }

          return {
            ...node,
            left: typeCheckExp(node.left) as Typed<ECIdentifier>,
            right: typeCheckExp(node.right),
            ectype: ErrorType,
          };
        }
      )
      .with({ type: "ECAwaitExpression" }, () => {
        throw new Error(`await is not yet implemented.`);
      })
      .with({ type: "ECBinaryExpression" }, (node) => {
        const left = typeCheckExp(node.left);
        const leftType = left.ectype;

        const right = typeCheckExp(node.right);
        const rightType = right.ectype;

        return {
          ...node,
          left,
          right,
          ectype: match<ECBinaryOperator, Type>(node.operator)
            .with("===", "!==", () => {
              if (
                leftType.baseType !== "error" &&
                rightType.baseType !== "error" &&
                !leftType.eq(rightType)
              ) {
                scope.error(
                  {
                    code: "TYPE_MISMATCH",
                    message: `Cannot compare differing types ${leftType} and ${rightType}.`,
                  },
                  node
                );
              }

              if (
                !["bool", "num", "str", "error"].includes(leftType.baseType)
              ) {
                scope.error(
                  {
                    code: "INVALID_OPERATION",
                    message: `${leftType} cannot be used with ${node.operator}.`,
                  },
                  left
                );
              }

              if (
                !["bool", "num", "str", "error"].includes(rightType.baseType)
              ) {
                scope.error(
                  {
                    code: "INVALID_OPERATION",
                    message: `${rightType} cannot be used with ${node.operator}.`,
                  },
                  right
                );
              }

              return Bool;
            })
            .with("<", "<=", ">", ">=", () => {
              if (leftType.baseType !== "error" && !leftType.eq(Num)) {
                scope.error(
                  {
                    code: "INVALID_OPERATION",
                    message: `${leftType} cannot be used with ${node.operator} (must be Num).`,
                  },
                  left
                );
              }

              if (rightType.baseType !== "error" && !rightType.eq(Num)) {
                scope.error(
                  {
                    code: "INVALID_OPERATION",
                    message: `${rightType} cannot be used with ${node.operator} (must be Num).`,
                  },
                  left
                );
              }

              return Bool;
            })
            .with("+", () => {
              if (
                leftType.baseType !== "error" &&
                !leftType.eq(Num) &&
                !leftType.eq(Str)
              ) {
                scope.error(
                  {
                    code: "INVALID_OPERATION",
                    message: `${leftType} cannot be used with ${node.operator} (must be Num or Str).`,
                  },
                  left
                );
              }

              if (
                rightType.baseType !== "error" &&
                !rightType.eq(Num) &&
                !rightType.eq(Str)
              ) {
                scope.error(
                  {
                    code: "INVALID_OPERATION",
                    message: `${rightType} cannot be used with ${node.operator} (must be Num or Str).`,
                  },
                  right
                );
              }

              if (
                leftType.baseType !== "error" &&
                rightType.baseType !== "error" &&
                !leftType.eq(rightType)
              ) {
                scope.error(
                  {
                    code: "TYPE_MISMATCH",
                    message: `Types on both sides of '+' must match: got ${leftType} and ${rightType}.`,
                  },
                  node
                );

                // If the types don't match, the number will be coerced to a string.
                return Str;
              } else {
                return Num;
              }
            })
            .with(
              "-",
              "*",
              "/",
              "%",
              "**",
              "|",
              "&",
              "^",
              "<<",
              ">>",
              ">>>",
              () => {
                if (leftType.baseType !== "error" && !leftType.eq(Num)) {
                  scope.error(
                    {
                      code: "INVALID_OPERATION",
                      message: `${leftType.baseType} cannot be used with ${node.operator} (must be Num).`,
                    },
                    left
                  );
                }

                if (rightType.baseType !== "error" && !rightType.eq(Num)) {
                  scope.error(
                    {
                      code: "INVALID_OPERATION",
                      message: `${rightType.baseType} cannot be used with ${node.operator} (must be Num).`,
                    },
                    right
                  );
                }

                return Num;
              }
            )
            .exhaustive(),
        };
      })
      .with({ type: "ECLogicalExpression" }, (node) => {
        const left = typeCheckExp(node.left);
        const leftType = left.ectype;

        const right = typeCheckExp(node.right);
        const rightType = right.ectype;

        if (leftType.baseType !== "error" && !leftType.eq(Bool)) {
          scope.error(
            {
              code: "INVALID_OPERATION",
              message: `${leftType} cannot be used with ${node.operator} (must be Bool).`,
            },
            left
          );
        }

        if (rightType.baseType !== "error" && !rightType.eq(Bool)) {
          scope.error(
            {
              code: "INVALID_OPERATION",
              message: `${rightType} cannot be used with ${node.operator} (must be Bool).`,
            },
            right
          );
        }

        return {
          ...node,
          left,
          right,
          ectype: Bool,
        };
      })
      .with(
        { type: "ECCallExpression" },
        (
          node
        ):
          | Typed<ECCallExpression>
          | Typed<ECTypeDeclaration>
          | Typed<ECTypeMethodCall>
          | Typed<ECJSCall> => {
          // There's a lot going on here. Because Ectype "keywords" are implemented as functions,
          // the Call Expression handler has extra logic for handling calls to these special cases.

          // Check if call was to the special js() function
          if (
            node.callee.type === "ECIdentifier" &&
            node.callee.name === "js"
          ) {
            if (node.arguments.length <= 0 || node.arguments.length > 2) {
              throw new Error(`js() expects one or two arguments.`);
            }

            if (node.arguments[0].type !== "ECArrowFunctionExpression") {
              throw new Error(
                `First js() argument must be an arrow function literal.`
              );
            }

            return {
              ...node,
              type: "ECJSCall",
              fn: node.arguments[0],
              ectype:
                node.arguments[1].type === "ECSpreadElement"
                  ? ErrorType
                  : resolveTypeExp(node.arguments[1]),
            };
          }

          const typeDeclaration = parseTypeDeclaration(node);
          if (typeDeclaration) {
            return typeDeclaration;
          }

          const typeMethod = parseTypeMethodCall(node);
          if (typeMethod) {
            return typeMethod;
          }

          // Normal call expression.
          const typedFn = typeCheckExp(node.callee); // Type of the function being called.
          const fnType = typedFn.ectype;
          if (fnType.baseType === "error") {
            // If user called a non-function, no return type can be inferred and
            // we have no choice but to pass the error up. (We don't log another
            // error; it would have been logged when the incoming error surfaced.)

            return {
              ...node,
              callee: typedFn,
              // We don't have parameter types to check the args against, but we
              // can still check the argrument expressions themselves.
              arguments: node.arguments.map((arg) =>
                arg.type === "ECSpreadElement"
                  ? {
                      ...arg,
                      argument: typeCheckExp(arg.argument),
                    }
                  : typeCheckExp(arg)
              ),
              ectype: ErrorType,
            };
          }

          if (fnType.baseType !== "fn") {
            throw new Error(
              `Callee is not a function (got ${fnType.baseType}).`
            );
          }

          const fnTypeParams = fnType.params();

          // Check argument count.
          if (node.arguments.length !== fnTypeParams.length) {
            throw new Error(
              `Expected ${fnType.params().length} arguments but got ${
                node.arguments.length
              }`
            );
          }

          // Check argument types.
          const typedArgs = node.arguments.map((arg, i) => {
            if (arg.type === "ECSpreadElement") {
              scope.error(
                {
                  code: "UNIMPLEMENTED",
                  message:
                    "Spread elements in function calls are not yet supported.",
                },
                arg
              );

              return {
                ...arg,
                argument: typeCheckExp(arg.argument),
              };
            }

            const typedArg = typeCheckExp(arg);
            const argType = typedArg.ectype;

            if (argType.baseType !== "error" && !argType.eq(fnTypeParams[i])) {
              scope.error(
                {
                  code: "TYPE_MISMATCH",
                  message: `Argument ${i} (of type ${argType}) does not match expected type ${fnTypeParams[i]}`,
                },
                arg
              );
            }

            return typedArg;
          });

          // If return type is a Type, try to resolve it.
          const returnBaseType = fnType.returns().baseType;
          const returnType =
            returnBaseType === "type"
              ? (() => {
                  // For now, all function types resolve to Deferred.
                  return typeValFrom(Deferred);
                })()
              : fnType.returns();

          return {
            ...node,
            callee: typedFn,
            arguments: typedArgs,
            ectype: returnType,
          };
        }
      )
      .with({ type: "ECConditionalExpression" }, (node) => {
        const test = typeCheckExp(node.test);
        const testType = test.ectype;
        if (testType.baseType !== "error" && !testType.eq(Bool)) {
          scope.error(
            {
              code: "TYPE_MISMATCH",
              message: `Condition for ternary expression must be a Bool.`,
            },
            node.test
          );
        }

        const consequent = typeCheckExp(node.consequent);
        const consequentType = consequent.ectype;
        const alternate = typeCheckExp(node.alternate);
        const alternateType = alternate.ectype;

        if (
          consequentType.baseType !== "error" &&
          alternateType.baseType !== "error" &&
          !consequentType.eq(alternateType)
        ) {
          scope.error(
            {
              code: "TYPE_MISMATCH",
              message: `Types for ternary expression results must match.`,
            },
            node
          );
        }

        return {
          ...node,
          test,
          consequent,
          alternate,
          ectype: alternateType,
        };
      })
      .with({ type: "ECMemberExpression" }, (node) => {
        const target = typeCheckExp(node.object);
        const targetType = target.ectype;

        return {
          ...node,
          object: target,
          property: typeCheckExp(node.property),
          ectype: match<Type, Type>(targetType)
            .with({ baseType: "struct" }, (structType) => {
              // Read on a struct value.
              if (node.computed) {
                scope.error(
                  {
                    code: "INVALID_SYNTAX",
                    message: "Bracket accesses on a struct are forbidden.",
                  },
                  node
                );

                return ErrorType;
              }

              if (node.property.type !== "ECIdentifier") {
                scope.error(
                  {
                    code: "INVALID_SYNTAX",
                    message: "Property on struct must be an identifier.",
                  },
                  node.property
                );

                return ErrorType;
              }

              if (!structType.has(node.property.name)) {
                throw new Error(
                  `Type ${targetType} has no field ${node.property.name}.`
                );
              }

              return structType.field(node.property.name);
            })
            .with({ baseType: "array" }, (arrayType) => {
              if (node.computed) {
                // field access; must be a number.

                const indexType = typeCheckExp(node.property).ectype;

                if (indexType.baseType !== "error" && !indexType.eq(Num)) {
                  scope.error(
                    {
                      code: "TYPE_MISMATCH",
                      message: `Array index must be a nunmber.`,
                    },
                    node.property
                  );
                }

                return arrayType.contains();
              } else {
                // must be an array member like length, map, etc.
                if (node.property.type !== "ECIdentifier") {
                  scope.error(
                    {
                      code: "INVALID_SYNTAX",
                      message: "Array member must be an identifier.",
                    },
                    node.property
                  );

                  return ErrorType;
                }

                return (
                  match(node.property.name)
                    // TODO somehow generate string methods from the TypeScript definition.
                    .with("length", () => Num)
                    .with("includes", () => fn([Str], Bool))
                    .with("toString", () => fn([], Str))
                    .otherwise(() => {
                      throw new Error(
                        `Array functions are not yet implemented.`
                      );
                    })
                );
              }
            })
            .with({ baseType: "variant" }, (variantType) => {
              scope.error(
                {
                  code: "INVALID_OPERATION",
                  message: `Property accesses on a variant instance are forbidden. (Did you mean to call a variant instance method instead?)`,
                },
                node.property
              );

              return ErrorType;
            })
            .with({ baseType: "num" }, () => {
              const nodeType = node.property.type;
              if (nodeType !== "ECIdentifier") {
                throw new Error("Bracket accesses on a number are forbidden.");
              }

              return match(node.property.name)
                .with("toString", () => fn([], Str))
                .otherwise(() => {
                  throw new Error(
                    `"${nodeType}" is not a valid function on a number.`
                  );
                });
            })
            .with({ baseType: "type" }, () => {
              // All members on a type-value are methods and must be called.
              // Calls to type-value methods are handled with call expressions.
              // If parsing has reached this point, then a member on a type has been accessed without a call.
              throw new Error(`Type methods must be called.`);
            })
            .with({ baseType: "str" }, () => {
              if (node.computed) {
                // Bracket access
                return Str;
              } else {
                if (node.property.type !== "ECIdentifier") {
                  // Must be identifier if node.computed is false
                  throw new Error(
                    "Property must be identifier when node is computed (internal error)"
                  );
                }

                const method = node.property.name;
                return match(method)
                  .with("includes", () => fn([Str], Bool))
                  .otherwise(() => {
                    throw new Error(
                      `${method} is not a valid function on a string.`
                    );
                  });
              }
            })
            .with({ baseType: "tuple" }, (targetType) => {
              if (node.computed) {
                scope.error(
                  {
                    code: "INVALID_SYNTAX",
                    message: `Only bracket accesses are permitted on tuples.`,
                  },
                  node
                );

                return ErrorType;
              }

              if (node.property.type !== "ECNumberLiteral") {
                scope.error(
                  {
                    code: "INVALID_SYNTAX",
                    message: `Tuple index must be a number literal (tuple indexes cannot be accessed with expressions).`,
                  },
                  node.property
                );
                return ErrorType;
              }

              const index = node.property.value;
              if (index < 0 || index >= targetType.fields().length) {
                throw new Error(
                  `${index} is not a valid index on ${targetType}.`
                );
              }

              return targetType.fields()[index];
            })
            .otherwise(() => {
              throw new Error(
                `Member expressions are not supported on ${targetType}.`
              );
            }),
        };
      })
      .with({ type: "ECSequenceExpression" }, (node) => {
        node.expressions.forEach((exp) => typeCheckExp(exp));

        return typeCheckExp(node.expressions[node.expressions.length - 1]);
      })
      .with({ type: "ECTaggedTemplateExpression" }, () => {
        throw new Error(`Tagged templates are not yet implemented.`);
      })
      .with({ type: "ECTemplateLiteral" }, (node) => {
        node.expressions.forEach((exp) => typeCheckExp(exp));

        return {
          ...node,
          expressions: node.expressions.map((e) => typeCheckExp(e)),
          ectype: Str,
        };
      })
      .with({ type: "ECUnaryExpression" }, (node) => ({
        ...node,
        argument: typeCheckExp(node.argument),
        ectype: match<ECUnaryOperator, Type>(node.operator)
          .with("!", () => Bool)
          .with("+", () => Num)
          .with("-", () => Num)
          .with("~", () => Num)
          .exhaustive(),
      }))
      .with({ type: "ECArrayExpression" }, () => {
        throw new Error(
          `Bare array expressions are forbidden; they must be attached to an array type.`
        );
      })
      .with({ type: "ECArrowFunctionExpression" }, () => {
        throw new Error(
          `Bare function expressions are forbidden; they must be attached to a function type.`
        );
      })
      .with({ type: "ECObjectExpression" }, (node) => {
        scope.error(
          {
            code: "INVALID_SYNTAX",
            message: `Bare object expressions are not permitted in Ectype; they must be attached to a struct or variant type.`,
          },
          node
        );

        return {
          ...node,
          properties: [], // TODO something more intelligent with the internals
          ectype: ErrorType,
        };
      })
      .with({ type: "ECImportExpression" }, (node) => {
        scope.error(
          {
            code: "UNIMPLEMENTED",
            message: "Import expressions are not yet supported.",
          },
          node
        );

        return {
          ...node,
          source: typeCheckExp(node.source),
          ectype: ErrorType,
        };
      })
      .with({ type: "ECRegexp" }, (node) => {
        scope.error(
          {
            code: "UNIMPLEMENTED",
            message: "Regexes are not yet supported.",
          },
          node
        );

        return {
          ...node,
          ectype: ErrorType,
        };
      })
      .with(
        { type: "ECTypeDeclaration" },
        { type: "ECTypeMethodCall" },
        { type: "ECJSCall" },
        ({ type }) => {
          throw new Error(
            `${type} can only occur after type checking; this means something has gone wrong internally.`
          );
        }
      )
      .exhaustive();

  // Resolves the value of a type-expression.
  // While `typeCheckExp` returns the type of an expression, `resolveType` attempts to parse and return the *value*
  // of that expression - but only for type values. (This will not resolve other values, such as numbers).
  // Example: typeCheckExp(Num) => Type // resolveType(Num) => Num
  // Example: typeCheckExp(2) => Num // resolveType(2) => (invalid)
  const resolveTypeExp = (node: ECExp): Type =>
    match<ECExp, Type>(node)
      .with({ type: "ECIdentifier" }, (node) =>
        match(node.name)
          .with("Unknown", () => Unknown)
          .with("Null", () => Null)
          .with("Bool", () => Bool)
          .with("Num", () => Num)
          .with("Str", () => Str)
          .with("Type", () => TypeType)
          .otherwise(() => {
            // Try resolving the identifier as a type variable.
            const maybeType = scope.current.get(node.name);

            if (maybeType === null) {
              throw new Error(`${node.name} is not defined.`);
            }

            if (maybeType.baseType !== "type") {
              throw new Error(`${node.name} is not a type-value.`);
            }

            return maybeType.type();
          })
      )
      // TODO resolve anonymous types from type function calls (e.g. struct()).
      .otherwise(() => {
        // Try getting the type of the expression.
        const expType = typeCheckExp(node).ectype;
        if (expType.baseType !== "type") {
          throw new Error(
            `Expected a type-value but got ${expType.toString()}`
          );
        }

        return expType.type();
      });

  const parseTypeDeclaration = bindParseTypeDeclaration({
    scope,
    resolveTypeExp,
    typeCheckExp,
    typeCheckNode,
  });

  const parseTypeMethodCall = bindParseTypeMethodCall({
    scope,
    typeCheckExp,
    typeCheckNode,
    resolveTypeExp,
  });

  return typeCheckExp;
};
