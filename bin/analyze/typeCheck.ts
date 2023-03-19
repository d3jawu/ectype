import type {
  KBinaryOperator,
  KExp,
  KNode,
  KUnaryOperator,
} from "../types/KytheraNode";

import { Type, TypeType } from "../../core/types.js";
import { Void, Null, Bool, Num, Str } from "../../core/primitives.js";

import { match } from "ts-pattern";
import { struct } from "../../core/struct.js";
import { variant } from "../../core/variant.js";

import { option } from "../../lib/option.js";

// TODO: type this more strongly?
const isTypeName = (name: string): boolean =>
  ["fn", "tuple", "array", "variant", "struct"].includes(name);

const typeValFrom = (t: Type): Type => {
  if (t.__ktype__ === "type") {
    throw new Error("A type-value cannot contain a type-value.");
  }

  return {
    __ktype__: "type",
    sub: () => false,
    valid: (other: unknown) => false,
    type: () => t,
  };
};

export class SymbolTable {
  parent: SymbolTable | null;
  values: Record<string, Type>;

  constructor(parent: SymbolTable | null) {
    this.parent = parent;
    this.values = {};
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

// typeCheck returns the global symbol table for debugging purposes.
export const typeCheck = (body: KNode[]): SymbolTable => {
  let currentScope = new SymbolTable(null);
  // Seed root scope with existing types.
  currentScope.set("Void", typeValFrom(Void));
  currentScope.set("Null", typeValFrom(Null));
  currentScope.set("Bool", typeValFrom(Bool));
  currentScope.set("Num", typeValFrom(Num));
  currentScope.set("Str", typeValFrom(Str));

  const typeCheckNode = (node: KNode) =>
    match<KNode, void>(node)
      .with(
        { type: "BreakStatement" },
        { type: "ContinueStatement" },
        { type: "DebuggerStatement" },
        { type: "EmptyStatement" },
        { type: "ExportNamedDeclaration" },
        { type: "ImportDeclaration" },
        () => {}
      )
      .with({ type: "KBlockStatement" }, (node) => {
        node.statements.forEach((st) => typeCheckNode(st));
      })
      .with({ type: "KForStatement" }, (node) => {
        if (node.init && node.init.type !== "KVariableDeclaration") {
          typeCheckExp(node.init);
        }

        if (node.test) {
          const testType = typeCheckExp(node.test);

          if (!testType.sub(Bool)) {
            throw new Error(`Condition for for-loop must be a Bool.`);
          }
        }

        if (node.update) {
          typeCheckExp(node.update);
        }

        typeCheckNode(node.body);
      })
      .with({ type: "KIfStatement" }, (node) => {
        const testType = typeCheckExp(node.test);
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for if-statement must be a Bool.`);
        }

        typeCheckNode(node.consequent);

        if (node.alternate) {
          typeCheckNode(node.alternate);
        }
      })
      .with({ type: "KLabeledStatement" }, (node) => {
        typeCheckNode(node.body);
      })
      .with({ type: "KReturnStatement" }, (node) => {
        if (node.argument) {
          typeCheckExp(node.argument);
        }
      })
      .with({ type: "KSwitchStatement" }, (node) => {
        typeCheckExp(node.discriminant);

        node.cases.forEach((c) => {
          if (c.test) {
            typeCheckExp(c.test);
          }

          c.consequent.forEach((n) => typeCheckNode(n));
        });
      })
      .with({ type: "KTryStatement" }, (node) => {
        typeCheckNode(node.block);

        if (node.handler) {
          if (node.handler.param) {
            // TODO: this should probably use the same logic as destructuring on function parameters
            typeCheckPattern(node.handler.param);
          }

          typeCheckNode(node.handler.body);
        }

        if (node.finalizer) {
          typeCheckNode(node.finalizer);
        }
      })
      .with({ type: "KVariableDeclaration" }, (node) => {
        node.declarations.forEach((decl) => {
          if (!decl.init) {
            throw new Error(`Variable ${decl.id} must be initialized.`);
          }

          const ident: string = match(decl.id)
            .with({ type: "Identifier" }, (id) => id.value)
            .otherwise(() => {
              throw new Error(
                `Declarations with ${decl.id.type} are not yet supported.`
              );
            });

          currentScope.set(ident, typeCheckExp(decl.init));
        });
      })
      .with({ type: "KWhileStatement" }, (node) => {
        const testType = typeCheckExp(node.test);
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for while-statement must be a Bool.`);
        }

        typeCheckNode(node.body);
      })
      .otherwise((node) => typeCheckExp(node as KExp));

  const typeCheckExp = (node: KExp): Type =>
    match<KExp, Type>(node)
      // TODO BigInt needs its own type.
      .with({ type: "BigIntLiteral" }, (node) => Num)
      .with({ type: "BooleanLiteral" }, (node) => Bool)
      .with({ type: "NullLiteral" }, (node) => Null)
      .with({ type: "NumericLiteral" }, (node) => Num)
      .with({ type: "StringLiteral" }, (node) => Str)
      .with({ type: "Identifier" }, (node) => {
        const maybeType = currentScope.get(node.value);
        if (!maybeType) {
          throw new Error(`${node.value} is undeclared.`);
        }

        return maybeType;
      })
      .with({ type: "KAssignmentExpression" }, (node) => {
        const leftType: Type = match(node.left)
          .with(
            { type: "Identifier" },
            (node) =>
              currentScope.get(node.value) ||
              (() => {
                throw new Error(
                  `Attempted to assign to undefined variable ${node.value}`
                );
              })()
          )
          .otherwise(() => {
            throw new Error(
              `Assignments to ${node.left.type} are not yet supported.`
            );
          });

        const rightType = typeCheckExp(node.right);

        if (!rightType.sub(leftType)) {
          throw new Error(
            `Expected type compatible with ${leftType} but got ${rightType}`
          );
        }

        return rightType;
      })
      .with({ type: "KAwaitExpression" }, () => {
        throw new Error(`await is not yet implemented.`);
      })
      .with({ type: "KBinaryExpression" }, (node) =>
        match<KBinaryOperator, Type>(node.operator)
          .with("===", "!==", "&&", "||", () => {
            const left = typeCheckExp(node.left);
            const right = typeCheckExp(node.right);

            if (!left.sub(Bool) || !right.sub(Bool)) {
              throw new Error(
                `${node.operator} requires a Bool on both sides.`
              );
            }

            return Bool;
          })
          .with("<", "<=", ">", ">=", () => {
            const left = typeCheckExp(node.left);
            const right = typeCheckExp(node.right);

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
              const left = typeCheckExp(node.left);
              const right = typeCheckExp(node.right);

              if (!left.sub(Num) || !right.sub(Num)) {
                throw new Error(
                  `${node.operator} requires a Num on both sides.`
                );
              }

              return Num;
            }
          )
          .with("??", () => {
            throw new Error("`??` is forbidden in Kythera.");
          })
          .exhaustive()
      )
      .with({ type: "KCallExpression" }, (node) => {
        // Because Kythera "keywords" are implemented as functions, the Call Expression handler has extra logic for handling these special cases.

        // Check to see if call was a type declaration, e.g. struct({})
        if (
          node.callee.type === "Identifier" &&
          isTypeName(node.callee.value)
        ) {
          return match(node.callee.value)
            .with("fn", () => {
              throw new Error("Not yet implemented");
            })
            .with("tuple", () => {
              throw new Error("Not yet implemented");
            })
            .with("array", () => {
              throw new Error("Not yet implemented");
            })
            .with("variant", () => {
              if (node.arguments.length !== 1) {
                throw new Error(
                  `Expected exactly 1 argument to variant() but got ${node.arguments.length}`
                );
              }

              const optionsNode = node.arguments[0].expression;

              if (optionsNode.type !== "KObjectExpression") {
                throw new Error(
                  `struct() parameter must be an object literal.`
                );
              }

              const options = optionsNode.properties.reduce(
                (acc: Record<string, Type>, prop) => {
                  if (prop.type !== "KKeyValueProperty") {
                    throw new Error(
                      `${prop.type} in variant options is not yet supported.`
                    );
                  }

                  if (prop.key.type !== "Identifier") {
                    throw new Error(
                      `Cannot use ${prop.key.type} as key in variant options.`
                    );
                  }

                  if (prop.key.value[0] !== prop.key.value[0].toUpperCase()) {
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

              if (shapeNode.type !== "KObjectExpression") {
                throw new Error(
                  `struct() parameter must be an object literal.`
                );
              }

              const shape = shapeNode.properties.reduce(
                (acc: Record<string, Type>, prop) => {
                  if (prop.type !== "KKeyValueProperty") {
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
            });
        }

        // Check if call was a type method, e.g. MyType.from()
        // TODO find a way to avoid type-checking node.callee.object twice
        if (
          node.callee.type === "KMemberExpression" &&
          typeCheckExp(node.callee.object).__ktype__ === "type"
        ) {
          const memberExp = node.callee;

          if (memberExp.property.type === "KComputed") {
            throw new Error(`Computed property calls on types are forbidden.`);
          }

          const methodName = memberExp.property.value;

          const targetType = typeCheckExp(memberExp.object) as TypeType;

          return match(targetType.type())
            .with({ __ktype__: "struct" }, (structType) => {
              return match(methodName)
                .with("from", () => {
                  const shapeNode = node.arguments[0].expression;

                  if (shapeNode.type !== "KObjectExpression") {
                    throw new Error(
                      `struct() parameter must be an object literal.`
                    );
                  }

                  const shape = shapeNode.properties.reduce(
                    (acc: Record<string, Type>, prop) => {
                      if (prop.type !== "KKeyValueProperty") {
                        throw new Error(
                          `${prop.type} in struct shapes are not yet supported.`
                        );
                      }

                      if (prop.key.type !== "Identifier") {
                        throw new Error(
                          `Cannot use ${prop.key.type} key in struct shape.`
                        );
                      }

                      acc[prop.key.value] = typeCheckExp(prop.value);

                      return acc;
                    },
                    {}
                  );

                  const inputType = struct(shape);

                  if (!inputType.sub(structType)) {
                    // TODO explain incompatibility in error message
                    throw new Error(
                      `Invalid cast to struct type: ${inputType} vs ${structType}`
                    );
                  }

                  return structType;
                })
                .with("conform", () => {
                  // TODO type-check this for:
                  // a) if it's impossible for the input value to conform
                  // b) if `conform` is not necessary and `from` can be used.

                  return option(structType).Option;
                })
                .otherwise(() => {
                  throw new Error(
                    `${methodName} is not a valid struct operation.`
                  );
                });
            })
            .otherwise(() => {
              throw new Error(
                `Type methods on ${targetType.__ktype__} are not yet implemented.`
              );
            });
        }

        if (node.callee.type === "Import") {
          throw new Error(`import() is not supported at this time.`);
        }

        // Normal call expression.
        const fnType = typeCheckExp(node.callee); // Type of the function being called.
        if (fnType.__ktype__ !== "fn") {
          throw new Error(`Callee is not a function.`);
        }

        if (node.arguments.length === 0) {
          if (fnType.param().__ktype__ !== "void") {
            throw new Error(
              `Function called with no arguments but expected ${fnType.param()}`
            );
          }
        } else {
          if (fnType.param().__ktype__ === "void") {
            throw new Error(
              `Expected no arguments to be passed to void function, but got ${node.arguments.length}`
            );
          }

          const argType = typeCheckExp(node.arguments[0].expression);
          if (!argType.sub(fnType.param())) {
            throw new Error(
              `Expected ${fnType.param()} for parameter but got ${argType}`
            );
          }
        }

        return fnType.returns();
      })
      .with({ type: "KConditionalExpression" }, (node) => {
        const testType = typeCheckExp(node.test);
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for ternary expression must be a Bool.`);
        }

        const consequentType = typeCheckExp(node.consequent);
        const alternateType = typeCheckExp(node.alternate);

        if (
          !consequentType.sub(alternateType) ||
          !alternateType.sub(consequentType)
        ) {
          throw new Error(`Types for ternary expression results must match.`);
        }

        return alternateType;
      })
      .with({ type: "KMemberExpression" }, (node) => {
        const targetType = typeCheckExp(node.object);

        return match<Type, Type>(targetType)
          .with({ __ktype__: "struct" }, (structType) => {
            // Read on a struct value.
            if (node.property.type === "KComputed") {
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
            } else if (node.property.type === "KComputed") {
              // field access; must be a number.

              if (!typeCheckExp(node.property.expression).sub(Num)) {
                throw new Error(`Array index must be a nunmber.`);
              }

              return arrayType.contains();
            }

            node.property;
            throw new Error(`Unreachable (node.property has type never)`);
          })
          .with({ __ktype__: "variant" }, () => {
            throw new Error(`Not yet implemented`);
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
          });
      })
      .with({ type: "KArrayExpression" }, () => {
        throw new Error(
          `Bare array expressions are forbidden; they must be attached to an array type.`
        );
      })
      .with({ type: "KArrowFunctionExpression" }, () => {
        throw new Error(
          `Bare function expressions are forbidden; they must be attached to a function type.`
        );
      })
      .with({ type: "KObjectExpression" }, () => {
        throw new Error(
          `Bare object expressions are not permitted in Kythera; they must be attached to a struct or variant type.`
        );
      })
      .with({ type: "KSequenceExpression" }, (node) => {
        node.expressions.forEach((exp) => typeCheckExp(exp));

        return typeCheckExp(node.expressions[node.expressions.length - 1]);
      })
      .with({ type: "KTaggedTemplateExpression" }, () => {
        throw new Error(`Tagged templates are not yet implemented.`);
      })
      .with({ type: "KTemplateLiteral" }, (node) => {
        node.expressions.forEach((exp) => typeCheckExp(exp));

        return Str;
      })
      .with({ type: "KUnaryExpression" }, (node) =>
        match<KUnaryOperator, Type>(node.operator)
          .with("!", () => Bool)
          .with("+", () => Num)
          .with("-", () => Num)
          .with("~", () => Num)
          .exhaustive()
      )
      .exhaustive();

  // Resolves the value of a type-expression.
  // While `typeCheckExp` returns the type of an expression, `resolveType` attempts to parse and return the *value*
  // of that expression - but only for type values. (This will not resolve other values, such as numbers).
  // Example: typeCheckExp(Num) => Type // resolveType(Num) => Num
  // Example: typeCheckExp(2) => Num // resolveType(2) => (invalid)
  const resolveTypeExp = (node: KExp): Type =>
    match<KExp, Type>(node)
      .with({ type: "Identifier" }, (node) =>
        match(node.value)
          .with("Void", () => Void)
          .with("Null", () => Null)
          .with("Bool", () => Bool)
          .with("Num", () => Num)
          .with("Str", () => Str)
          .otherwise(() => {
            const maybeType = currentScope.get(node.value);

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
        // TODO return Deferred here instead of throwing.
        throw new Error(`Cannot resolve ${node} to a type.`);
      });

  body.forEach((node) => typeCheckNode(node));

  return currentScope;
};
