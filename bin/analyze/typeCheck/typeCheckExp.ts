import type {
  ECArgument,
  ECAssignmentExpression,
  ECBinaryOperator,
  ECCallExpression,
  ECExp,
  ECExprOrSpread,
  ECNode,
  ECTypeMethod,
  ECUnaryOperator,
  ECVariantMethodCall,
} from "../../types/ECNode";

import type { Typed, TypedExp } from "../../types/Typed";

import type { Scope } from "./typeCheck";

import { Bool, Null, Num, Str, Void } from "../../../core/primitives.js";
import { Type } from "../../../core/types.js";

import { array } from "../../../core/array.js";
import { fn } from "../../../core/fn.js";
import { struct } from "../../../core/struct.js";
import { tuple } from "../../../core/tuple.js";
import { variant } from "../../../core/variant.js";

import { typeValFrom } from "../typeValFrom.js";
import { bindParseTypeMethodCall } from "./parseTypeMethodCall.js";
import { bindParseVariantMethodCall } from "./parseVariantMethodCall.js";

import { match } from "ts-pattern";

const isTypeName = (name: Type["__ktype__"]): boolean =>
  ["fn", "tuple", "array", "variant", "struct"].includes(name);

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
          if (node.left.type !== "Identifier") {
            throw new Error(
              `Assignments to non-identifiers (e.g. patterns) are not yet supported.`
            );
          }

          const leftType = scope.current.get(node.left.value);
          if (leftType === null) {
            throw new Error(
              `Attempted to assign to undefined variable ${node.left.value}`
            );
          }

          const rightType = typeCheckExp(node.right).ectype;

          if (!rightType.sub(leftType)) {
            throw new Error(
              `Expected type compatible with ${leftType} but got ${rightType}`
            );
          }

          return {
            ...node,
            // @ts-ignore I have no clue why it won't take this.
            left: node.left,
            right: typeCheckExp(node.right),
            ectype: rightType,
          };
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

            if (!left.sub(right) && !right.sub(left)) {
              throw new Error(`Types ${left} and ${right} are incompatible.`);
            }

            return Bool;
          })
          .with("&&", "||", () => {
            const left = typeCheckExp(node.left).ectype;
            const right = typeCheckExp(node.right).ectype;

            if (!left.sub(Bool) || !right.sub(Bool)) {
              throw new Error(
                `${node.operator} requires a Bool on both sides.`
              );
            }

            return Bool;
          })
          .with("<", "<=", ">", ">=", () => {
            const left = typeCheckExp(node.left).ectype;
            const right = typeCheckExp(node.right).ectype;

            if (!left.sub(Num) || !right.sub(Num)) {
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

              if (!left.sub(Num) || !right.sub(Num)) {
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
          | Typed<ECTypeMethod>
          | Typed<ECVariantMethodCall> => {
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
            // The second argument to js() is optional, defaulting to Null if absent.
            return {
              ...node,
              callee: {
                // Callee type does not matter (`js()` should be treated as a keyword, not a function).
                ...node.callee,
                ectype: Void,
              },
              arguments: [], // Argument types don't matter.
              ectype: node.arguments[1]
                ? resolveTypeExp(node.arguments[1].expression)
                : Null,
            };
          }

          // Check to see if call was a type declaration, e.g. struct({})
          if (
            node.callee.type === "ECIdentifier" &&
            isTypeName(node.callee.value as Type["__ktype__"]) // Hmm. Might rethink the typing to make this assertion unnecessary.
          ) {
            return {
              ...node,
              callee: {
                // Callee type does not matter (`js()` should be treated as a keyword, not a function).
                ...node.callee,
                ectype: Void,
              },
              arguments: [],
              ectype: match(node.callee.value)
                .with("fn", () => {
                  if (node.arguments.length !== 2) {
                    throw new Error(
                      `Expected exactly 2 arguments to fn() but got ${node.arguments.length}`
                    );
                  }

                  const paramsNode = node.arguments[0].expression;

                  if (paramsNode.type !== "ECArrayExpression") {
                    throw new Error(
                      `First argument to fn() must be an array literal.`
                    );
                  }

                  const returnsNode = node.arguments[1].expression;

                  const paramTypes = (<ECExprOrSpread[]>(
                    paramsNode.elements.filter((el) => !!el)
                  )).map((el) => resolveTypeExp(el.expression));
                  const returnType = resolveTypeExp(returnsNode);

                  return typeValFrom(fn(paramTypes, returnType));
                })
                .with("tuple", () => {
                  if (node.arguments.length !== 1) {
                    throw new Error(
                      `Expected exactly 1 argument to tuple() but got ${node.arguments.length}`
                    );
                  }

                  const entriesNode = node.arguments[0].expression;

                  if (entriesNode.type !== "ECArrayExpression") {
                    throw new Error(
                      `Argument to tuple() must be an array literal.`
                    );
                  }

                  const entryTypes = (<ECExprOrSpread[]>(
                    entriesNode.elements.filter((el) => !!el)
                  )).map((el) => resolveTypeExp(el.expression));

                  return typeValFrom(tuple(entryTypes));
                })
                .with("array", () => {
                  if (node.arguments.length !== 1) {
                    throw new Error(
                      `Expected exactly 1 argument to array() but got ${node.arguments.length}`
                    );
                  }

                  const containsNode = node.arguments[0];

                  if (containsNode.spread) {
                    throw new Error(
                      `Spread arguments are not allowed in array().`
                    );
                  }

                  const argType = typeCheckExp(containsNode.expression).ectype;

                  if (argType.__ktype__ !== "type") {
                    throw new Error(`array() parameter must be a type.`);
                  }

                  const resolvedType = resolveTypeExp(containsNode.expression);

                  return typeValFrom(array(resolvedType));
                })
                .with("variant", () => {
                  if (node.arguments.length !== 1) {
                    throw new Error(
                      `Expected exactly 1 argument to variant() but got ${node.arguments.length}`
                    );
                  }

                  const optionsNode = node.arguments[0].expression;

                  if (optionsNode.type !== "ECObjectExpression") {
                    throw new Error(
                      `Argument to struct() must be an object literal.`
                    );
                  }

                  const options = optionsNode.properties.reduce(
                    (acc: Record<string, Type>, prop) => {
                      if (prop.type !== "ECKeyValueProperty") {
                        throw new Error(
                          `${prop.type} in variant options is not yet supported.`
                        );
                      }

                      if (prop.key.type !== "Identifier") {
                        throw new Error(
                          `Cannot use ${prop.key.type} as key in variant options.`
                        );
                      }

                      if (
                        prop.key.value[0] !== prop.key.value[0].toUpperCase()
                      ) {
                        throw new Error(
                          `variant option ${prop.key.value} must begin with an uppercase letter.`
                        );
                      }

                      acc[prop.key.value] = resolveTypeExp(prop.value);

                      return acc;
                    },
                    {}
                  );

                  return typeValFrom(variant(options));
                })
                .with("struct", () => {
                  if (node.arguments.length !== 1) {
                    throw new Error(
                      `Expected exactly 1 argument to struct() but got ${node.arguments.length}`
                    );
                  }

                  const shapeNode = node.arguments[0].expression;

                  if (shapeNode.type !== "ECObjectExpression") {
                    throw new Error(
                      `struct() parameter must be an object literal.`
                    );
                  }

                  const shape = shapeNode.properties.reduce(
                    (acc: Record<string, Type>, prop) => {
                      if (prop.type !== "ECKeyValueProperty") {
                        throw new Error(
                          `${prop.type} in struct shapes is not yet supported.`
                        );
                      }

                      if (prop.key.type !== "Identifier") {
                        throw new Error(
                          `Cannot use ${prop.key.type} as key in struct shape.`
                        );
                      }

                      acc[prop.key.value] = resolveTypeExp(prop.value);

                      return acc;
                    },
                    {}
                  );

                  return typeValFrom(struct(shape));
                })
                .otherwise(() => {
                  throw new Error("Unreachable");
                }),
            };
          }

          const typeMethod = parseTypeMethodCall(node);
          if (typeMethod) {
            return typeMethod;
          }

          // See if call is a variant method.
          const variantMethodCall = parseVariantMethodCall(node);
          if (variantMethodCall) {
            return variantMethodCall;
          }

          // Normal call expression.
          const typedFn = typeCheckExp(node.callee); // Type of the function being called.
          const fnType = typedFn.ectype;
          if (fnType.__ktype__ !== "fn") {
            throw new Error(`Callee is not a function.`);
          }

          const fnTypeParams = fnType.params();

          if (node.arguments.length !== fnTypeParams.length) {
            throw new Error(
              `Expected ${fnType.params().length} arguments but got ${
                node.arguments.length
              }`
            );
          }

          const typedArgs: Typed<ECArgument>[] = node.arguments.map(
            (arg, i) => {
              const typedArg = typeCheckExp(arg.expression);
              const argType = typedArg.ectype;

              if (!argType.sub(fnTypeParams[i])) {
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

          return {
            ...node,
            callee: typedFn,
            arguments: typedArgs,
            ectype: fnType.returns(),
          };
        }
      )
      .with({ type: "ECConditionalExpression" }, (node) => {
        const testType = typeCheckExp(node.test).ectype;
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for ternary expression must be a Bool.`);
        }

        const consequentType = typeCheckExp(node.consequent).ectype;
        const alternateType = typeCheckExp(node.alternate).ectype;

        if (
          !consequentType.sub(alternateType) ||
          !alternateType.sub(consequentType)
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
            .with({ __ktype__: "struct" }, (structType) => {
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
            .with({ __ktype__: "array" }, (arrayType) => {
              if (node.property.type === "Identifier") {
                // must be an array member like length, map, etc.

                throw new Error(`Array functions are not yet implemented.`);
              } else if (node.property.type === "ECComputed") {
                // field access; must be a number.

                if (!typeCheckExp(node.property.expression).ectype.sub(Num)) {
                  throw new Error(`Array index must be a nunmber.`);
                }

                return arrayType.contains();
              }

              node.property;
              throw new Error(`Unreachable (node.property has type never)`);
            })
            .with({ __ktype__: "variant" }, (variantType) => {
              throw new Error(
                `Property accesses on a variant instance are forbidden. (Did you mean to call a variant instance method instead?)`
              );
            })
            .with({ __ktype__: "type" }, () => {
              // All members on a type-value are methods and must be called.
              // Calls to type-value methods are handled with call expressions.
              // If parsing has reached this point, then a member on a type has been accessed without a call.
              throw new Error(`Type methods must be called.`);
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
        { type: "ECTypeMethod" },
        { type: "ECVariantMethod" },
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
          .with("Void", () => Void)
          .with("Null", () => Null)
          .with("Bool", () => Bool)
          .with("Num", () => Num)
          .with("Str", () => Str)
          .otherwise(() => {
            // Try resolving the identifier as a type variable.
            const maybeType = scope.current.get(node.value);

            if (maybeType === null) {
              throw new Error(`${node.value} is not defined.`);
            }

            if (maybeType.__ktype__ !== "type") {
              throw new Error(`${node.value} is not a type-value.`);
            }

            return maybeType.type();
          })
      )
      .otherwise(() => {
        // Try getting the type of the expression.
        const expType = typeCheckExp(node).ectype;
        if (expType.__ktype__ !== "type") {
          throw new Error(
            `Expected a type-value but got ${expType.toString()}`
          );
        }

        return expType.type();

        // TODO maybe return Deferred here?
      });

  const parseTypeMethodCall = bindParseTypeMethodCall({
    scope,
    typeCheckExp,
    typeCheckNode,
  });

  const parseVariantMethodCall = bindParseVariantMethodCall({
    typeCheckExp,
  });

  return typeCheckExp;
};
