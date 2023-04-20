import type {
  ECBinaryOperator,
  ECExp,
  ECExprOrSpread,
  ECNode,
  ECUnaryOperator,
  ECArrowFunctionExpression,
} from "../types/ECNode";

import { FnType, Type, TypeType } from "../../core/types.js";
import { Void, Null, Bool, Num, Str } from "../../core/primitives.js";

import { match } from "ts-pattern";
import { struct } from "../../core/struct.js";
import { variant } from "../../core/variant.js";
import { array } from "../../core/array.js";
import { tuple } from "../../core/tuple.js";
import { fn } from "../../core/fn.js";

import { option } from "../../lib/option.js";

import { analyzeFile } from "./analyzeFile.js";

import { dirname, join as joinPaths } from "path";

// TODO: type this more strongly?
const isTypeName = (name: string): boolean =>
  ["fn", "tuple", "array", "variant", "struct"].includes(name);

export const typeValFrom = (t: Type): Type => {
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

// typeCheck returns the global symbol table for debugging purposes.
export const typeCheck = (
  body: ECNode[],
  path: string
): Record<string, Type> => {
  const exports: Record<string, Type> = {};

  let currentScope = new SymbolTable(null);

  const typeCheckNode = (node: ECNode) =>
    match<ECNode, void>(node)
      .with(
        { type: "BreakStatement" },
        { type: "ContinueStatement" },
        { type: "DebuggerStatement" },
        { type: "EmptyStatement" },
        () => {}
      )
      .with({ type: "ImportDeclaration" }, (node) => {
        // TODO handle modules in addition to raw paths
        const importedTypes = analyzeFile(
          joinPaths(dirname(path), node.source.value)
        );

        if (importedTypes === null) {
          // File was not an Ectype file; do nothing.
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type === "ImportDefaultSpecifier") {
            throw new Error(`Default imports are not yet implemented.`);
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            throw new Error(`Namespace imports are not yet implemented.`);
          }

          const remoteName = specifier.imported
            ? specifier.imported.value
            : specifier.local.value;
          const localName = specifier.local.value;

          if (!importedTypes[remoteName]) {
            throw new Error(
              `${remoteName} is not exported by ${node.source.value}.`
            );
          }

          currentScope.set(localName, importedTypes[remoteName]);
        });
      })
      .with({ type: "ExportNamedDeclaration" }, (node) => {
        if (node.source !== null) {
          throw new Error(`Re-exports are not yet supported.`);
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type === "ExportDefaultSpecifier") {
            throw new Error(`Default exports are forbidden in Ectype.`);
          }

          if (specifier.type === "ExportNamespaceSpecifier") {
            throw new Error(`Namespace exports are not yet implemented.`);
          }

          const exportedType = currentScope.get(specifier.orig.value);
          if (exportedType === null) {
            throw new Error(
              `Could not export ${specifier.orig.value} because it is not defined.`
            );
          }

          const exportedName = specifier.exported
            ? specifier.exported.value
            : specifier.orig.value;

          exports[exportedName] = exportedType;
        });
      })
      .with({ type: "ECBlockStatement" }, (node) => {
        node.statements.forEach((st) => typeCheckNode(st));
      })
      .with({ type: "ECForStatement" }, (node) => {
        if (node.init && node.init.type !== "ECVariableDeclaration") {
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
      .with({ type: "ECIfStatement" }, (node) => {
        const testType = typeCheckExp(node.test);
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for if-statement must be a Bool.`);
        }

        typeCheckNode(node.consequent);

        if (node.alternate) {
          typeCheckNode(node.alternate);
        }
      })
      .with({ type: "ECLabeledStatement" }, (node) => {
        typeCheckNode(node.body);
      })
      .with({ type: "ECReturnStatement" }, (node) => {
        if (!node.argument) {
          throw new Error(`A value must be returned.`);
        }
        const returnedType = typeCheckExp(node.argument);

        if (!!currentScope.returnType) {
          if (!returnedType.sub(currentScope.returnType)) {
            throw new Error(
              `Expected return type of ${currentScope.returnType} but got ${returnedType}`
            );
          }
        }
      })
      .with({ type: "ECSwitchStatement" }, (node) => {
        typeCheckExp(node.discriminant);

        node.cases.forEach((c) => {
          if (c.test) {
            typeCheckExp(c.test);
          }

          c.consequent.forEach((n) => typeCheckNode(n));
        });
      })
      .with({ type: "ECTryStatement" }, (node) => {
        typeCheckNode(node.block);

        if (node.handler) {
          if (node.handler.param) {
            // TODO: this should probably use the same logic as destructuring on function parameters
            // typeCheckPattern(node.handler.param);
            throw new Error(`Not yet implemented`);
          }

          typeCheckNode(node.handler.body);
        }

        if (node.finalizer) {
          typeCheckNode(node.finalizer);
        }
      })
      .with({ type: "ECVariableDeclaration" }, (node) => {
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
      .with({ type: "ECWhileStatement" }, (node) => {
        const testType = typeCheckExp(node.test);
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for while-statement must be a Bool.`);
        }

        typeCheckNode(node.body);
      })
      .otherwise((node) => typeCheckExp(node as ECExp));

  // Checks a bare function's parameter and return types against an expected function type.
  // Handles its own scope creation.
  const typeCheckFn = (
    fnNode: ECArrowFunctionExpression,
    expectedType: FnType
  ) => {
    const originalScope = currentScope;
    currentScope = new SymbolTable(currentScope, expectedType.returns());

    const expectedParams = expectedType.params();

    if (expectedParams.length !== fnNode.params.length) {
      throw new Error(
        `Expected ${expectedParams.length} parameters but implementation has ${fnNode.params.length}.`
      );
    }

    fnNode.params.forEach((param, i) => {
      if (param.type !== "Identifier") {
        throw new Error(
          `Function parameters other than identifiers are not yet implemented (got ${param.type})`
        );
      }

      currentScope.set(param.value, expectedParams[i]);
    });

    if (fnNode.body.type === "ECBlockStatement") {
      typeCheckNode(fnNode.body);

      const statements = fnNode.body.statements;
      if (statements.length === 0) {
        throw new Error(
          `Function body cannot be empty (it must return a value).`
        );
      }

      // Check for missing return
      const lastNode = statements[statements.length - 1];
      if (lastNode.type !== "ECReturnStatement") {
        throw new Error(`Function must explicitly return.`);
      }
    } else {
      typeCheckExp(fnNode.body);
    }

    currentScope = originalScope;
  };

  // TODO typeCheckExp is not pure, which may cause issues if the same node is checked twice (e.g. something that alters the symbol table). Audit for this.
  const typeCheckExp = (node: ECExp): Type =>
    match<ECExp, Type>(node)
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
      .with({ type: "ECAssignmentExpression" }, (node) => {
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
      .with({ type: "ECAwaitExpression" }, () => {
        throw new Error(`await is not yet implemented.`);
      })
      .with({ type: "ECBinaryExpression" }, (node) =>
        match<ECBinaryOperator, Type>(node.operator)
          .with("===", "!==", () => {
            const left = typeCheckExp(node.left);
            const right = typeCheckExp(node.right);

            if (!left.sub(right) && !right.sub(left)) {
              throw new Error(`Types ${left} and ${right} are incompatible.`);
            }

            return Bool;
          })
          .with("&&", "||", () => {
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
            throw new Error("`??` is forbidden in Ectype.");
          })
          .exhaustive()
      )
      .with({ type: "ECCallExpression" }, (node) => {
        // Because Ectype "keywords" are implemented as functions, the Call Expression handler has extra logic for handling these special cases.

        // Check if call was to the special js() function
        if (node.callee.type === "Identifier" && node.callee.value === "js") {
          // The second argument to js() is optional, defaulting to Void if absent.
          return node.arguments[1]
            ? resolveTypeExp(node.arguments[1].expression)
            : Void;
        }

        // Check to see if call was a type declaration, e.g. struct({})
        if (
          node.callee.type === "Identifier" &&
          isTypeName(node.callee.value)
        ) {
          return match(node.callee.value)
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
                throw new Error(`Spread arguments are not allowed in array().`);
              }

              const argType = typeCheckExp(containsNode.expression);

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
            });
        }

        // Check if call was a type method, e.g. MyType.from()
        if (node.callee.type === "ECMemberExpression") {
          const calleeType = typeCheckExp(node.callee.object);

          if (calleeType.__ktype__ === "type") {
            const memberExp = node.callee;

            if (memberExp.property.type === "ECComputed") {
              throw new Error(
                `Computed property calls on types are forbidden.`
              );
            }

            const methodName = memberExp.property.value;

            const targetType = typeCheckExp(memberExp.object) as TypeType;

            return match(targetType.type())
              .with({ __ktype__: "fn" }, (fnType) =>
                match(methodName)
                  .with("from", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to fn.from but got ${node.arguments.length}`
                      );
                    }

                    const literalNode = node.arguments[0].expression;

                    if (literalNode.type !== "ECArrowFunctionExpression") {
                      throw new Error(
                        `fn.from() must be an arrow function literal.`
                      );
                    }

                    // TODO function type introspection
                    typeCheckFn(literalNode, fnType);

                    return fnType;
                  })
                  .with("sub", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to fn.sub but got ${node.arguments.length}`
                      );
                    }

                    const argType = typeCheckExp(node.arguments[0].expression);

                    if (argType.__ktype__ !== "type") {
                      throw new Error(`Argument to sub() must be a type.`);
                    }

                    return Bool;
                  })
                  .otherwise(() => {
                    throw new Error(
                      `${methodName} is not a valid fn operation.`
                    );
                  })
              )
              .with({ __ktype__: "tuple" }, (tupleType) =>
                match(methodName)
                  .with("from", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to tuple.from but got ${node.arguments.length}`
                      );
                    }

                    const literalNode = node.arguments[0].expression;

                    if (literalNode.type !== "ECArrayExpression") {
                      throw new Error(`tuple.from() must be an array literal.`);
                    }

                    const shape = literalNode.elements.reduce(
                      (acc: Type[], el) => {
                        if (!el) {
                          return acc;
                        }

                        return [...acc, typeCheckExp(el.expression)];
                      },
                      []
                    );

                    const inputType = tuple(shape);

                    if (!inputType.sub(tupleType)) {
                      throw new Error(
                        `Invalid cast to tuple type: ${inputType} vs ${tupleType}`
                      );
                    }

                    return tupleType;
                  })
                  .with("valid", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to tuple.valid but got ${node.arguments.length}`
                      );
                    }

                    return Bool;
                  })
                  .with("sub", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to tuple.sub but got ${node.arguments.length}`
                      );
                    }

                    const argType = typeCheckExp(node.arguments[0].expression);

                    if (argType.__ktype__ !== "type") {
                      throw new Error(`Argument to sub() must be a type.`);
                    }

                    return Bool;
                  })
                  .otherwise(() => {
                    throw new Error(
                      `'${methodName}' is not a valid tuple operation.`
                    );
                  })
              )
              .with({ __ktype__: "array" }, (arrayType) =>
                match(methodName)
                  .with("from", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to array.from but got ${node.arguments.length}`
                      );
                    }

                    const literalNode = node.arguments[0].expression;

                    if (literalNode.type !== "ECArrayExpression") {
                      throw new Error(
                        `array.from() argument must be an array literal.`
                      );
                    }

                    literalNode.elements.forEach((el, i) => {
                      if (!el) {
                        return;
                      }

                      const elType = typeCheckExp(el.expression);

                      if (!elType.sub(arrayType.contains())) {
                        throw new Error(
                          `Expected ${arrayType.contains()} but got ${elType} for element ${i}.`
                        );
                      }
                    });

                    return arrayType;
                  })
                  .with("conform", () => {
                    // TODO type-check this for:
                    // a) if it's impossible for the input value to conform
                    // b) if `conform` is not necessary and `from` can be used.

                    return option(arrayType);
                  })
                  .with("sub", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to array.sub but got ${node.arguments.length}`
                      );
                    }

                    const argType = typeCheckExp(node.arguments[0].expression);

                    if (argType.__ktype__ !== "type") {
                      throw new Error(`Argument to sub() must be a type.`);
                    }

                    return Bool;
                  })
                  .otherwise(() => {
                    throw new Error(
                      `'${methodName}' is not a valid array operation.`
                    );
                  })
              )
              .with({ __ktype__: "struct" }, (structType) =>
                match(methodName)
                  .with("from", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to struct.from but got ${node.arguments.length}`
                      );
                    }

                    const literalNode = node.arguments[0].expression;

                    if (literalNode.type !== "ECObjectExpression") {
                      throw new Error(
                        `struct.from() parameter must be an object literal.`
                      );
                    }

                    const shape = literalNode.properties.reduce(
                      (acc: Record<string, Type>, prop) => {
                        if (prop.type !== "ECKeyValueProperty") {
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
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to struct.conform but got ${node.arguments.length}`
                      );
                    }
                    // TODO type-check this for:
                    // a) if it's impossible for the input value to conform
                    // b) if `conform` is not necessary and `from` can be used.

                    return option(structType);
                  })
                  .with("valid", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to struct.valid but got ${node.arguments.length}`
                      );
                    }

                    return Bool;
                  })
                  .with("has", () => {
                    throw new Error(`Not yet implemented.`);

                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to struct.has but got ${node.arguments.length}`
                      );
                    }

                    // The return type here is tricky. I think we need a deferred type here.
                    // It's not possible to know for sure what the parameter (and therefore the returned type) is.
                    return Void;
                  })
                  .with("fields", () => {
                    throw new Error(`Not yet implemented.`);

                    // map type needs to be implemented first
                  })
                  .with("sub", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to struct.sub but got ${node.arguments.length}`
                      );
                    }

                    const argType = typeCheckExp(node.arguments[0].expression);

                    if (argType.__ktype__ !== "type") {
                      throw new Error(`Argument to sub() must be a type.`);
                    }

                    return Bool;
                  })
                  .otherwise(() => {
                    throw new Error(
                      `'${methodName}' is not a valid struct operation.`
                    );
                  })
              )
              .with({ __ktype__: "variant" }, (variantType) =>
                match(methodName)
                  .with("sub", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to variant.sub but got ${node.arguments.length}`
                      );
                    }

                    const argType = typeCheckExp(node.arguments[0].expression);

                    if (argType.__ktype__ !== "type") {
                      throw new Error(`Argument to sub() must be a type.`);
                    }

                    return Bool;
                  })
                  .with("of", () => {
                    if (node.arguments.length !== 1) {
                      throw new Error(
                        `Expected exactly 1 argument to variant.sub but got ${node.arguments.length}`
                      );
                    }

                    const arg = node.arguments[0];
                    if (arg.expression.type !== "ECObjectExpression") {
                      throw new Error(
                        `Argument to variant.of must be an object literal.`
                      );
                    }

                    if (arg.expression.properties.length !== 1) {
                      throw new Error(
                        `Argument to variant.of must have exactly one key set.`
                      );
                    }

                    if (
                      arg.expression.properties[0].type !== "ECKeyValueProperty"
                    ) {
                      throw new Error(
                        `Argument to variant.of must use literal key.`
                      );
                    }

                    const { key, value } = arg.expression.properties[0];

                    if (
                      key.type !== "Identifier" &&
                      key.type !== "StringLiteral"
                    ) {
                      throw new Error(`variant.of key must be a string.`);
                    }

                    if (!variantType.has(key.value)) {
                      throw new Error(
                        `${
                          key.value
                        } is not a valid option in variant ${variantType.toString()}`
                      );
                    }

                    const valueType = typeCheckExp(value);

                    if (!valueType.sub(variantType.get(key.value))) {
                      throw new Error(
                        `Expected type ${variantType.get(
                          key.value
                        )} for variant option ${key.value} but got ${valueType}`
                      );
                    }

                    return variantType;
                  })
                  .otherwise(() => {
                    throw new Error(
                      `'${methodName}' is not a valid variant operation.`
                    );
                  })
              )
              .otherwise(() => {
                throw new Error(
                  `Type methods on ${
                    targetType.type().__ktype__
                  } are not yet implemented. (Tried to call '${methodName}')`
                );
              });
          }

          if (calleeType.__ktype__ === "variant") {
            const memberExp = node.callee;

            if (memberExp.property.type === "Identifier") {
              return match(memberExp.property.value)
                .with("when", () => {
                  if (node.arguments.length !== 1) {
                    throw new Error(`Expected exactly `);
                  }

                  const handlersMap = node.arguments[0].expression;
                  if (handlersMap.type !== "ECObjectExpression") {
                    throw new Error(
                      `Expected call to variant when to be an object literal.`
                    );
                  }

                  // Ensure all handlers return the same type.
                  let seenReturnType: Type;
                  let seenProps: string[] = [];
                  // TODO: this will have to be refactored (maybe to .find()) when we start returning error objects instead of throwing.
                  handlersMap.properties.forEach((prop, i) => {
                    if (prop.type === "ECSpreadElement") {
                      throw new Error(
                        `Spread ... expressions in "when" are not yet implemented.`
                      );
                    }

                    if (prop.type !== "ECKeyValueProperty") {
                      throw new Error(
                        `Expected a key-value property in "when".`
                      );
                    }

                    if (
                      prop.key.type !== "Identifier" &&
                      prop.key.type !== "StringLiteral"
                    ) {
                      throw new Error(
                        `Handler key in "when" must be an identifier or string literal.`
                      );
                    }

                    seenProps.push(prop.key.value);

                    const handlerType = typeCheckExp(prop.value);
                    if (handlerType.__ktype__ !== "fn") {
                      throw new Error(`Handler for "when" must be a function.`);
                    }

                    const handlerReturnType = handlerType.returns();

                    // Note: this logic does mean that the first handler gets to determine the return type of the other handlers
                    // (the other handlers' return types must be a subtype of the first return type.)
                    // TODO: find the broadest type possible across all types and type the return to that type.
                    if (i === 0) {
                      seenReturnType = handlerReturnType;
                    } else if (!handlerReturnType.sub(seenReturnType)) {
                      throw new Error(
                        `Expected type ${seenReturnType} but got ${handlerReturnType}`
                      );
                    }

                    return true;
                  });

                  // Ensure that match coverage is exhaustive or uses
                  const tags = calleeType.tags();
                  if (!seenProps.includes("*")) {
                    // Skip if wildcard handler used
                    tags.forEach((expectedTag) => {
                      if (!seenProps.includes(expectedTag)) {
                        throw new Error(
                          `"when" handlers are not exhaustive (missing ${expectedTag})`
                        );
                      }
                    });

                    // TODO warn if handler set includes handler for tag that does not exist (and will therefore never be run)
                  }

                  return seenReturnType;
                })
                .otherwise((prop) => {
                  throw new Error(`${prop} is not a valid variant method.`);
                });
            } else if (memberExp.property.type === "ECComputed") {
              throw new Error(`Bracket accesses on a variant are forbidden.`);
            }

            memberExp.property;
            throw new Error(`Unreachable (node.property has type never)`);
          }
        }

        if (node.callee.type === "Import") {
          throw new Error(`import() is not supported at this time.`);
        }

        // Normal call expression.
        const fnType = typeCheckExp(node.callee); // Type of the function being called.
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

        node.arguments.forEach((arg, i) => {
          const argType = typeCheckExp(arg.expression);

          if (!argType.sub(fnTypeParams[i])) {
            throw new Error(
              `Argument ${i} (of type ${argType}) does not match expected type ${fnTypeParams[i]}`
            );
          }
        });

        return fnType.returns();
      })
      .with({ type: "ECConditionalExpression" }, (node) => {
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
      .with({ type: "ECMemberExpression" }, (node) => {
        const targetType = typeCheckExp(node.object);

        return match<Type, Type>(targetType)
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

              if (!typeCheckExp(node.property.expression).sub(Num)) {
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
          });
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

        return Str;
      })
      .with({ type: "ECUnaryExpression" }, (node) =>
        match<ECUnaryOperator, Type>(node.operator)
          .with("!", () => Bool)
          .with("+", () => Num)
          .with("-", () => Num)
          .with("~", () => Num)
          .exhaustive()
      )
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
      .exhaustive();

  // Resolves the value of a type-expression.
  // While `typeCheckExp` returns the type of an expression, `resolveType` attempts to parse and return the *value*
  // of that expression - but only for type values. (This will not resolve other values, such as numbers).
  // Example: typeCheckExp(Num) => Type // resolveType(Num) => Num
  // Example: typeCheckExp(2) => Num // resolveType(2) => (invalid)
  const resolveTypeExp = (node: ECExp): Type =>
    match<ECExp, Type>(node)
      .with({ type: "Identifier" }, (node) =>
        match(node.value)
          .with("Void", () => Void)
          .with("Null", () => Null)
          .with("Bool", () => Bool)
          .with("Num", () => Num)
          .with("Str", () => Str)
          .otherwise(() => {
            // Try resolving the identifier as a type variable.
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
        // Try getting the type of the expression.
        const expType = typeCheckExp(node);
        if (expType.__ktype__ !== "type") {
          throw new Error(
            `Expected a type-value but got ${expType.toString()}`
          );
        }

        return expType.type();

        // TODO maybe return Deferred here?
      });

  body.forEach((node) => typeCheckNode(node));

  return exports;
};
