import type {
  ECArrowFunctionExpression,
  ECCallExpression,
  ECTypeMethodCall,
} from "../../types/ECNode";
import type { Typed } from "../../types/Typed";

import type { FnType, Type } from "../../../core/core";

import type { bindTypeCheckExp } from "./typeCheckExp";
import type { bindTypeCheckNode } from "./typeCheckNode";

import { SymbolTable } from "../SymbolTable.js";

import {
  Bool,
  Deferred,
  Num,
  Str,
  Type as TypeType,
  Unknown,
  struct,
  tuple,
} from "../../../core/core.js";

import { option } from "../../../lib/option.js";

import { match } from "ts-pattern";
import { Scope } from "./typeCheck";

export const bindParseTypeMethodCall = ({
  typeCheckExp,
  typeCheckNode,
  scope,
}: {
  scope: Scope;
  // These methods should also be bound to `scope`.
  typeCheckExp: ReturnType<typeof bindTypeCheckExp>;
  typeCheckNode: ReturnType<typeof bindTypeCheckNode>;
}) => {
  // Returns an ECTypeMethodCall if the incoming call expression matches, null otherwise.
  const parseTypeMethodCall = (
    callExp: ECCallExpression
  ): Typed<ECTypeMethodCall> | null => {
    if (callExp.callee.type !== "ECMemberExpression") {
      return null;
    }

    // The node for the type-value this method is being called on.
    const typeVal = typeCheckExp(callExp.callee.object);
    const targetType = typeVal.ectype;
    if (targetType.baseType !== "type") {
      return null;
    }

    const memberExp = callExp.callee;
    if (memberExp.property.type === "ECComputed") {
      throw new Error(`Computed property calls on type methods are forbidden.`);
    }

    const method = memberExp.property.value;

    const args = callExp.arguments;

    // Reusable handler for the "eq" method (which is the same across all types.)
    const handleEq = () => {
      if (args.length !== 1) {
        throw new Error(
          `Expected exactly 1 argument to eq but got ${args.length}`
        );
      }

      // TODO warn if the eq() is always true or false (which is the case if both types are known statically).

      const argType = typeCheckExp(args[0].expression).ectype;

      if (argType.baseType !== "type") {
        throw new Error(`Argument to eq() must be a type.`);
      }

      return Bool;
    };

    const ectype = match(targetType.type()) // Note that we are matching against the underlying type.
      .with({ baseType: "null" }, () =>
        match(method)
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to null.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Null.`);
          })
      )
      .with({ baseType: "bool" }, () =>
        match(method)
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to bool.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Bool.`);
          })
      )
      .with({ baseType: "num" }, () =>
        match(method)
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to num.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to Num.conform but got ${args.length}`
              );
            }

            return option(Num);
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Num.`);
          })
      )
      .with({ baseType: "str" }, () =>
        match(method)
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to str.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Str.`);
          })
      )
      .with({ baseType: "fn" }, (fnType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to fn.from but got ${args.length}`
              );
            }

            const literalNode = args[0].expression;

            if (literalNode.type !== "ECArrowFunctionExpression") {
              throw new Error(`fn.from() must be an arrow function literal.`);
            }

            typeCheckFn(literalNode, fnType);

            return fnType;
          })
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to fn.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid fn operation.`);
          })
      )
      .with({ baseType: "tuple" }, (tupleType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to tuple.from but got ${args.length}`
              );
            }

            const literalNode = args[0].expression;

            if (literalNode.type !== "ECArrayExpression") {
              throw new Error(`tuple.from() must be an array literal.`);
            }

            const shape = literalNode.elements.reduce((acc: Type[], el) => {
              if (!el) {
                return acc;
              }

              return [...acc, typeCheckExp(el.expression).ectype];
            }, []);

            const inputType = tuple(shape);

            if (!inputType.eq(tupleType)) {
              throw new Error(
                `Invalid cast to tuple type: ${inputType} vs ${tupleType}`
              );
            }

            return tupleType;
          })
          .with("valid", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to tuple.valid but got ${args.length}`
              );
            }

            return Bool;
          })
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to tuple.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .with("field", () => {
            throw new Error(`tuple.field cannot be used at runtime.`);
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid tuple operation.`);
          })
      )
      .with({ baseType: "array" }, (arrayType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to array.from but got ${args.length}`
              );
            }

            const literalNode = args[0].expression;

            if (literalNode.type !== "ECArrayExpression") {
              throw new Error(
                `array.from() argument must be an array literal.`
              );
            }

            literalNode.elements.forEach((el, i) => {
              if (!el) {
                return;
              }

              const elType = typeCheckExp(el.expression).ectype;

              if (!elType.eq(arrayType.contains())) {
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
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to array.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid array operation.`);
          })
      )
      .with({ baseType: "cond" }, (condType) =>
        match(method)
          .with("from", () => {
            throw new Error(`"from" cannot be used on a conditional type.`);
          })
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to cond.conform but got ${args.length}`
              );
            }

            return option(condType);
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid array operation.`);
          })
      )
      .with({ baseType: "struct" }, (structType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.from but got ${args.length}`
              );
            }

            const literalNode = args[0].expression;

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

                acc[prop.key.value] = typeCheckExp(prop.value).ectype;

                return acc;
              },
              {}
            );

            const inputType = struct(shape);

            if (!inputType.eq(structType)) {
              // TODO explain incompatibility in error message
              throw new Error(
                `Invalid cast to struct type:\nGot:\n${inputType}\nExpected:\n${structType}`
              );
            }

            return structType;
          })
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.conform but got ${args.length}`
              );
            }
            // TODO type-check this for:
            // a) if it's impossible for the input value to conform
            // b) if `conform` is not necessary and `from` can be used.

            return option(structType);
          })
          .with("valid", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.valid but got ${args.length}`
              );
            }

            return Bool;
          })
          .with("has", () => {
            throw new Error(`Not yet implemented.`);

            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.has but got ${args.length}`
              );
            }

            return Bool;
          })
          .with("fields", () => {
            throw new Error(`Not yet implemented.`);

            // map type needs to be implemented first
          })
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("eq", handleEq)
          .with("toString", () => {
            if (args.length !== 0) {
              throw new Error(
                `Expected exactly no arguments to struct.toString but got ${args.length}`
              );
            }

            return Str;
          })
          .with("get", () => {
            throw new Error(`struct.get cannot be used at runtime.`);
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid struct operation.`);
          })
      )
      .with({ baseType: "variant" }, (variantType) =>
        match(method)
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to variant.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.baseType !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .with("of", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to variant.sub but got ${args.length}`
              );
            }

            const arg = args[0];
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

            if (arg.expression.properties[0].type !== "ECKeyValueProperty") {
              throw new Error(`Argument to variant.of must use literal key.`);
            }

            const { key, value } = arg.expression.properties[0];

            if (key.type !== "Identifier" && key.type !== "StringLiteral") {
              throw new Error(`variant.of key must be a string.`);
            }

            if (!variantType.has(key.value)) {
              throw new Error(
                `${
                  key.value
                } is not a valid option in variant ${variantType.toString()}`
              );
            }

            const valueType = typeCheckExp(value).ectype;

            if (!valueType.eq(variantType.get(key.value))) {
              throw new Error(
                `Expected type ${variantType.get(
                  key.value
                )} for variant option ${key.value} but got ${valueType}`
              );
            }

            return variantType;
          })
          .with("get", () => {
            throw new Error(`variant.get cannot be used at runtime.`);
          })
          .with("conform", () => {
            throw new Error(`A variant type instance cannot be conformed.`);
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid variant operation.`);
          })
      )
      .with({ baseType: "type" }, (typeType) => {
        // Since Type is its own type (calling type() on Type returns Type), it has the same type (Type) as a runtime type-value, e.g. the return value of a fn([Type], Type),
        // both cases will have the same type signature in the analyzer.
        // To disambiguate, we have to manually check if the value being read is Type itself.
        // This does depend on the user being unable to create their own new references to Type.
        // TODO revisit this. Renamed references to Type are always possible through function calls.
        if (typeVal.type === "ECIdentifier" && typeVal.value === "Type") {
          // Type constant
          return match(method)
            .with("from", () => {
              if (args.length !== 1) {
                throw new Error(
                  `Expected exactly 1 argument to type.from but got ${args.length}`
                );
              }

              const argType = typeCheckExp(args[0].expression).ectype;

              if (argType.baseType !== "type") {
                throw new Error(
                  `Only type-values can be cast to Type (got ${argType}).`
                );
              }

              return TypeType;
            })
            .with("conform", () => {
              throw new Error(
                `A value cannot be conformed to Type at runtime.`
              );
            })
            .otherwise(() => {
              throw new Error(`${method} is not a valid method on Type.`);
            });
        } else {
          throw new Error(
            `Internal error: a type's underlying type cannot be Type.`
          );
        }
      })
      .with({ baseType: "unknown" }, () =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to unknown.from but got ${args.length}`
              );
            }

            // Casting to Unknown always succeeds.

            return Unknown;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid function on Unknown`);
          })
      )
      .with({ baseType: "deferred" }, () =>
        match(method)
          .with("from", () => {
            throw new Error(
              `"from" cannot be used with a type that is not known statically.`
            );
          })
          .with("conform", () => {
            return option(Deferred);
          })
          .otherwise(() => {
            throw new Error(
              `${method} is not a valid function on a Deferred type.`
            );
          })
      )
      .otherwise(() => {
        throw new Error(
          `Type methods on ${
            targetType.type().baseType
          } are not yet implemented. (Tried to call '${method}')`
        );
      });

    return {
      type: "ECTypeMethodCall",
      targetType: targetType.baseType,
      method,
      arguments: callExp.arguments.map((arg) => arg.expression),
      span: callExp.span,
      ectype,
    };
  };

  // Checks a bare function's parameter and return types against an expected function type.
  const typeCheckFn = (fnNode: ECArrowFunctionExpression, fnType: FnType) => {
    const expectedParams = fnType.params();

    if (expectedParams.length !== fnNode.params.length) {
      throw new Error(
        `Expected ${expectedParams.length} parameters but implementation has ${fnNode.params.length}.`
      );
    }

    const paramTypes: Record<string, Type> = {};
    fnNode.params.forEach((param, i) => {
      if (param.type !== "ECIdentifier") {
        throw new Error(
          `Function parameters other than identifiers are not yet implemented (got ${param.type})`
        );
      }

      paramTypes[param.value] = expectedParams[i];
    });

    const inferredReturnType = inferReturnType(fnNode, paramTypes);
    if (!inferredReturnType.eq(fnType.returns())) {
      throw new Error(
        `Expected function to return ${fnType.returns()} but got ${inferredReturnType}.`
      );
    }
  };

  // Visits (and type-checks) a function node and infers i return type.
  // Handles its own scope creation.
  const inferReturnType = (
    fnNode: ECArrowFunctionExpression,
    paramTypes: Record<string, Type>
  ): Type => {
    // Spawn new function scope
    const originalScope = scope.current;
    scope.current = new SymbolTable(scope.current, true);

    // Load parameters into scope
    fnNode.params.forEach((param, i) => {
      if (param.type !== "ECIdentifier") {
        throw new Error(
          `Function parameters other than identifiers are not yet implemented (got ${param.type})`
        );
      }

      scope.current.set(param.value, paramTypes[param.value]);
    });

    let inferredType: Type;
    if (fnNode.body.type === "ECBlockStatement") {
      typeCheckNode(fnNode.body);

      const statements = fnNode.body.statements;
      if (statements.length === 0) {
        throw new Error(
          `Function body cannot be empty (it must return a value).`
        );
      }

      // Check for missing return at end of body
      const lastNode = statements[statements.length - 1];
      if (lastNode.type !== "ECReturnStatement") {
        throw new Error(`Function must explicitly return.`);
      }

      if (scope.current.inferredReturnType === null) {
        throw new Error(
          `Could not infer a type. Is the function missing a return statement?`
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

  return parseTypeMethodCall;
};
