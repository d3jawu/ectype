import type {
  ECArgument,
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

import { Deferred } from "../../../core/internal.js";

import { bindParseTypeDeclaration } from "./parseTypeDeclaration.js";
import { bindParseTypeMethodCall } from "./parseTypeMethodCall.js";

import { typeValFrom } from "../typeValFrom.js";

import { match } from "ts-pattern";
import { ECPattern } from "../../types/ECPattern.js";

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
      .with({ type: "BigIntLiteral" }, (node) => ({ ...node, ectype: Num }))
      .with({ type: "BooleanLiteral" }, (node) => ({ ...node, ectype: Bool }))
      .with({ type: "NullLiteral" }, (node) => ({ ...node, ectype: Null }))
      .with({ type: "NumericLiteral" }, (node) => ({ ...node, ectype: Num }))
      .with({ type: "ECStringLiteral" }, (node) => ({ ...node, ectype: Str }))
      .with({ type: "ECIdentifier" }, (node) => {
        const type = scope.current.get(node.value);
        if (!type) {
          throw new Error(`${node.value} is undeclared.`);
        }

        return {
          ...node,
          ectype: type,
        };
      })
      .with(
        { type: "ECAssignmentExpression" },
        (node): Typed<ECAssignmentExpression> => {
          return match<ECPattern, Typed<ECAssignmentExpression>>(node.left)
            .with({ type: "ECIdentifier" }, (lhs) => {
              const leftType = scope.current.get(lhs.value);
              if (leftType === null) {
                throw new Error(
                  `Attempted to assign to undefined variable ${lhs.value}`
                );
              }

              const right = typeCheckExp(node.right);
              const rightType = right.ectype;

              if (!rightType.eq(leftType)) {
                throw new Error(`Expected ${leftType} but got ${rightType}`);
              }

              return {
                ...node,
                left: typeCheckExp(node.left as ECIdentifier),
                right,
                ectype: rightType,
              };
            })
            .with({ type: "ECMemberExpression" }, (lhs) => {
              const left = typeCheckExp(lhs);
              const leftType = left.ectype;

              const right = typeCheckExp(node.right);
              const rightType = right.ectype;

              if (!rightType.eq(leftType)) {
                throw new Error(
                  `Expected type compatible with ${leftType} but got ${rightType}`
                );
              }

              return {
                ...node,
                left,
                right,
                ectype: rightType,
              };
            })
            .otherwise(() => {
              throw new Error(
                `Assignments to ${node.left.type} are not allowed.`
              );
            });
        }
      )
      .with({ type: "ECAwaitExpression" }, () => {
        throw new Error(`await is not yet implemented.`);
      })
      .with({ type: "ECBinaryExpression" }, (node) => ({
        ...node,
        left: typeCheckExp(node.left),
        right: typeCheckExp(node.right),
        ectype: match<ECBinaryOperator, Type>(node.operator)
          .with("===", "!==", () => {
            const left = typeCheckExp(node.left).ectype;
            const right = typeCheckExp(node.right).ectype;

            if (!left.eq(right) && !right.eq(left)) {
              throw new Error(`Types ${left} and ${right} are incompatible.`);
            }

            return Bool;
          })
          .with("&&", "||", () => {
            const left = typeCheckExp(node.left).ectype;
            const right = typeCheckExp(node.right).ectype;

            if (!left.eq(Bool) || !right.eq(Bool)) {
              throw new Error(
                `${node.operator} requires a Bool on both sides.`
              );
            }

            return Bool;
          })
          .with("<", "<=", ">", ">=", () => {
            const left = typeCheckExp(node.left).ectype;
            const right = typeCheckExp(node.right).ectype;

            if (!left.eq(Num) || !right.eq(Num)) {
              throw new Error(`${node.operator} requires a Num on both sides.`);
            }

            return Bool;
          })
          .with(
            "+",
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
              const left = typeCheckExp(node.left).ectype;
              const right = typeCheckExp(node.right).ectype;

              if (!left.eq(Num) || !right.eq(Num)) {
                throw new Error(
                  `${node.operator} requires a Num on both sides.`
                );
              }

              return Num;
            }
          )
          .with("??", () => {
            throw new Error("`??` is forbidden in Ectype.");
          })
          .exhaustive(),
      }))
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

          if (node.callee.type === "Import") {
            throw new Error(`import() is not supported at this time.`);
          }

          // Check if call was to the special js() function
          if (
            node.callee.type === "ECIdentifier" &&
            node.callee.value === "js"
          ) {
            if (node.arguments.length <= 0 || node.arguments.length > 2) {
              throw new Error(`js() expects one or two arguments.`);
            }

            if (
              node.arguments[0].expression.type !== "ECArrowFunctionExpression"
            ) {
              throw new Error(
                `First js() argument must be an arrow function literal.`
              );
            }

            return {
              span: node.span,
              type: "ECJSCall",
              fn: node.arguments[0].expression,
              ectype: node.arguments[1]
                ? resolveTypeExp(node.arguments[1].expression)
                : Null,
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
          const typedArgs: Typed<ECArgument>[] = node.arguments.map(
            (arg, i) => {
              const typedArg = typeCheckExp(arg.expression);
              const argType = typedArg.ectype;

              if (!argType.eq(fnTypeParams[i])) {
                throw new Error(
                  `Argument ${i} (of type ${argType}) does not match expected type ${fnTypeParams[i]}`
                );
              }

              return {
                ...arg,
                expression: typedArg,
              };
            }
          );

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
        const testType = typeCheckExp(node.test).ectype;
        if (!testType.eq(Bool)) {
          throw new Error(`Condition for ternary expression must be a Bool.`);
        }

        const consequentType = typeCheckExp(node.consequent).ectype;
        const alternateType = typeCheckExp(node.alternate).ectype;

        if (
          !consequentType.eq(alternateType) ||
          !alternateType.eq(consequentType)
        ) {
          throw new Error(`Types for ternary expression results must match.`);
        }

        return {
          ...node,
          test: typeCheckExp(node.test),
          consequent: typeCheckExp(node.consequent),
          alternate: typeCheckExp(node.alternate),
          ectype: alternateType,
        };
      })
      .with({ type: "ECMemberExpression" }, (node) => {
        const target = typeCheckExp(node.object);
        const targetType = target.ectype;

        return {
          ...node,
          object: target,
          property:
            node.property.type === "Identifier"
              ? node.property
              : {
                  ...node.property,
                  expression: typeCheckExp(node.property.expression),
                },
          ectype: match<Type, Type>(targetType)
            .with({ baseType: "struct" }, (structType) => {
              // Read on a struct value.
              if (node.property.type === "ECComputed") {
                throw new Error("Bracket accesses on a struct are forbidden.");
              }

              if (!structType.has(node.property.value)) {
                throw new Error(
                  `Type ${targetType} has no field ${node.property.value}.`
                );
              }

              return structType.field(node.property.value);
            })
            .with({ baseType: "array" }, (arrayType) => {
              if (node.property.type === "Identifier") {
                // must be an array member like length, map, etc.

                return (
                  match(node.property.value)
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
              } else if (node.property.type === "ECComputed") {
                // field access; must be a number.

                if (!typeCheckExp(node.property.expression).ectype.eq(Num)) {
                  throw new Error(`Array index must be a nunmber.`);
                }

                return arrayType.contains();
              }

              node.property;
              throw new Error(`Unreachable (node.property has type never)`);
            })
            .with({ baseType: "variant" }, (variantType) => {
              throw new Error(
                `Property accesses on a variant instance are forbidden. (Did you mean to call a variant instance method instead?)`
              );
            })
            .with({ baseType: "num" }, () => {
              const nodeType = node.property.type;
              if (nodeType !== "Identifier") {
                throw new Error("Bracket accesses on a number are forbidden.");
              }

              return match(node.property.value)
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
              if (node.property.type === "ECComputed") {
                // Bracket access
                return Str;
              } else {
                const method = node.property.value;
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
              if (node.property.type !== "ECComputed") {
                throw new Error(
                  `Only bracket accesses are permitted on tuples.`
                );
              }

              if (node.property.expression.type !== "NumericLiteral") {
                throw new Error(
                  `Tuple index must be a number literal (tuple indexes cannot be accessed with expressions).`
                );
              }

              const index = node.property.expression.value;
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
      .with({ type: "ECObjectExpression" }, () => {
        throw new Error(
          `Bare object expressions are not permitted in Ectype; they must be attached to a struct or variant type.`
        );
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
        match(node.value)
          .with("Unknown", () => Unknown)
          .with("Null", () => Null)
          .with("Bool", () => Bool)
          .with("Num", () => Num)
          .with("Str", () => Str)
          .with("Type", () => TypeType)
          .otherwise(() => {
            // Try resolving the identifier as a type variable.
            const maybeType = scope.current.get(node.value);

            if (maybeType === null) {
              throw new Error(`${node.value} is not defined.`);
            }

            if (maybeType.baseType !== "type") {
              throw new Error(`${node.value} is not a type-value.`);
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
