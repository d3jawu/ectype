import type {
  ECArrowFunctionExpression,
  ECCallExpression,
  ECTypeMethodCall,
} from "../../types/ECNode";
import type { Typed } from "../../types/Typed";

import type { FnType } from "../../../core/types";

import type { bindTypeCheckExp } from "./typeCheckExp";
import type { bindTypeCheckNode } from "./typeCheckNode";

import { SymbolTable } from "../SymbolTable.js";

import { Bool, Void } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";
import { tuple } from "../../../core/tuple.js";
import { Type } from "../../../core/types.js";

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
    if (targetType.__ktype__ !== "type") {
      return null;
    }

    const memberExp = callExp.callee;
    if (memberExp.property.type === "ECComputed") {
      throw new Error(`Computed property calls on type methods are forbidden.`);
    }

    const method = memberExp.property.value;

    const args = callExp.arguments;

    const ectype = match(targetType.type())
      .with({ __ktype__: "fn" }, (fnType) =>
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

            // TODO function type introspection
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

            if (argType.__ktype__ !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .otherwise(() => {
            throw new Error(`${method} is not a valid fn operation.`);
          })
      )
      .with({ __ktype__: "tuple" }, (tupleType) =>
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

            if (!inputType.sub(tupleType)) {
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

            if (argType.__ktype__ !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid tuple operation.`);
          })
      )
      .with({ __ktype__: "array" }, (arrayType) =>
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
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to array.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.__ktype__ !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid array operation.`);
          })
      )
      .with({ __ktype__: "struct" }, (structType) =>
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

            if (!inputType.sub(structType)) {
              // TODO explain incompatibility in error message
              throw new Error(
                `Invalid cast to struct type: ${inputType} vs ${structType}`
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

            // The return type here is tricky. I think we need a deferred type here.
            // It's not possible to know for sure what the parameter (and therefore the returned type) is.
            return Void;
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

            if (argType.__ktype__ !== "type") {
              throw new Error(`Argument to sub() must be a type.`);
            }

            return Bool;
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid struct operation.`);
          })
      )
      .with({ __ktype__: "variant" }, (variantType) =>
        match(method)
          .with("sub", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to variant.sub but got ${args.length}`
              );
            }

            const argType = typeCheckExp(args[0].expression).ectype;

            if (argType.__ktype__ !== "type") {
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
            throw new Error(`'${method}' is not a valid variant operation.`);
          })
      )
      .otherwise(() => {
        throw new Error(
          `Type methods on ${
            targetType.type().__ktype__
          } are not yet implemented. (Tried to call '${method}')`
        );
      });

    return {
      type: "ECTypeMethodCall",
      targetType: targetType.__ktype__,
      method,
      arguments: callExp.arguments.map((arg) => arg.expression),
      span: callExp.span,
      ectype,
    };
  };

  // Checks a bare function's parameter and return types against an expected function type.
  // Handles its own scope creation.
  const typeCheckFn = (
    fnNode: ECArrowFunctionExpression,
    expectedType: FnType
  ) => {
    const originalScope = scope.current;
    scope.current = new SymbolTable(scope.current, expectedType.returns());

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

      scope.current.set(param.value, expectedParams[i]);
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

    scope.current = originalScope;
  };

  return parseTypeMethodCall;
};
