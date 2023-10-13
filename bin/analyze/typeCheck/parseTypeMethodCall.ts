import type {
  ECArrowFunctionExpression,
  ECCallExpression,
  ECExp,
  ECTypeMethodCall,
} from "../../types/ECNode";
import type { Typed } from "../../types/Typed";

import type { FnType, Type } from "../../../core/internal.js";

import type { bindTypeCheckExp } from "./typeCheckExp";
import type { bindTypeCheckNode } from "./typeCheckNode";

import {
  Bool,
  Num,
  Str,
  Type as TypeType,
  Unknown,
  struct,
  tuple,
} from "../../../core/core.js";

import { Deferred } from "../../../core/internal.js";

import { option } from "../../../lib/option.js";

import { match } from "ts-pattern";
import { typeValFrom } from "../typeValFrom.js";
import { bindInferReturnType } from "./inferReturnType.js";
import { Scope } from "./typeCheck";

export const bindParseTypeMethodCall = ({
  typeCheckExp,
  typeCheckNode,
  resolveTypeExp,
  scope,
}: {
  scope: Scope;
  // These methods should also be bound to `scope`.
  typeCheckExp: ReturnType<typeof bindTypeCheckExp>;
  typeCheckNode: ReturnType<typeof bindTypeCheckNode>;
  resolveTypeExp: (node: ECExp) => Type;
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

    // Reusable handler for the "valid" method (which is the same across all types.)
    const handleValid = () => {
      if (args.length !== 1) {
        throw new Error(
          `Expected exactly 1 argument to valid but got ${args.length}`
        );
      }
      // TODO warn if valid() is always true or false (which is the case if both types are known statically).
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
          .with("valid", handleValid)
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
          .with("valid", handleValid)
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
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to Num.conform but got ${args.length}`
              );
            }

            return option(Str);
          })
          .with("eq", handleEq)
          .with("valid", handleValid)
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
              throw new Error(
                `tuple.from() argument must be an array literal.`
              );
            }

            const shape = literalNode.elements.reduce((acc: Type[], el) => {
              if (!el) {
                return acc;
              }

              return [...acc, typeCheckExp(el.expression).ectype];
            }, []);

            const inputType = tuple(...shape);

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
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to variant.from but got ${args.length}`
              );
            }

            const arg = args[0];
            if (arg.expression.type !== "ECObjectExpression") {
              throw new Error(
                `Argument to variant.from must be an object literal.`
              );
            }

            if (arg.expression.properties.length !== 1) {
              throw new Error(
                `Argument to variant.from must have exactly one key set.`
              );
            }

            if (arg.expression.properties[0].type !== "ECKeyValueProperty") {
              throw new Error(`Argument to variant.from must use literal key.`);
            }

            const { key, value } = arg.expression.properties[0];

            if (key.type !== "Identifier" && key.type !== "StringLiteral") {
              throw new Error(`variant.from key must be a string.`);
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
          .with("valid", handleValid)
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
      .with({ baseType: "keyword" }, (kw) =>
        match(kw.keyword())
          .with("variant", () =>
            match(method)
              .with("match", () => {
                if (args.length !== 2) {
                  throw new Error(
                    `Expected exactly 2 arguments to variant match but got ${args.length}.`
                  );
                }

                const variantVal = typeCheckExp(args[0].expression);
                const variantType = variantVal.ectype;
                if (variantType.baseType !== "variant") {
                  throw new Error(
                    `First argument to variant match must be a variant.`
                  );
                }

                const handlersMap = args[1].expression;
                if (handlersMap.type !== "ECObjectExpression") {
                  throw new Error(
                    `Second argument to variant match should be an object mapping tags to handlers.`
                  );
                }

                const variantOptions = variantType.options();

                let unknownExists = false;

                let seenReturnType: Type = Unknown; // Set to Unknown initially so TypeScript knows it's always initialized.
                let seenTags: string[] = [];
                handlersMap.properties.forEach((prop, i) => {
                  if (prop.type === "ECSpreadElement") {
                    throw new Error(
                      `Spread ... expressions in "match" are not yet implemented.`
                    );
                  }

                  if (prop.type !== "ECKeyValueProperty") {
                    throw new Error(
                      `Expected a key-value property in "match".`
                    );
                  }

                  if (
                    prop.key.type !== "Identifier" &&
                    prop.key.type !== "StringLiteral"
                  ) {
                    throw new Error(
                      `Handler key in "match" must be an identifier or string literal.`
                    );
                  }

                  const tagName = prop.key.value; // constant to make TypeScript happy

                  if (
                    !variantOptions.some(([t]) => tagName === t) &&
                    tagName !== "_"
                  ) {
                    throw new Error(
                      `${tagName} is not a valid tag on this variant.`
                    );
                  }

                  seenTags.push(tagName);

                  let _handlerArgType: Type;
                  let _handler: ECArrowFunctionExpression;
                  // Handler can either be a function or tuple of [assertedType, handler]
                  if (tagName === "_") {
                    _handlerArgType = typeValFrom(Unknown);
                    if (prop.value.type !== "ECArrowFunctionExpression") {
                      throw new Error(
                        `Wildcard handler cannot take a type assertion.`
                      );
                    }
                    _handler = prop.value;
                  } else if (prop.value.type === "ECArrowFunctionExpression") {
                    // Known param type - use the type from the variant.
                    _handlerArgType = variantOptions.find(
                      ([t]) => t === tagName
                    )![1]; // Guaranteed to find, because we have already eliminated the case where the tag is not in the variant.
                    _handler = prop.value;
                  } else if (prop.value.type === "ECArrayExpression") {
                    if (
                      variantOptions.find(([t]) => t === tagName)![1]
                        .baseType !== "deferred"
                    ) {
                      // TODO downgrade to warning
                      throw new Error(
                        `Type assertion is unnecessary on ${tagName} because its type is known statically.`
                      );
                    }

                    // Asserted param type - use the type from the assertion.
                    if (prop.value.elements.length !== 2) {
                      throw new Error(
                        `Type assertion in match must have (only) type and handler.`
                      );
                    }

                    const assertedType = resolveTypeExp(
                      prop.value.elements[0]!.expression
                    );

                    _handlerArgType = assertedType;

                    if (
                      prop.value.elements[1]?.expression?.type !==
                      "ECArrowFunctionExpression"
                    ) {
                      throw new Error(
                        `Second value in match assertion must be a handler function.`
                      );
                    }

                    _handler = prop.value.elements[1].expression;
                    unknownExists = true;
                  } else {
                    throw new Error(
                      `Expected either a handler function or type assertion (got ${prop.value.type}).`
                    );
                  }
                  const handlerArgType = _handlerArgType;
                  const handler = _handler;

                  // Add param to scope, if the handler uses one.
                  const paramTypes: Record<string, Type> = {};
                  if (handler.params.length === 1) {
                    const param = handler.params[0];
                    if (param.type !== "ECIdentifier") {
                      throw new Error(
                        `Handler parameter must be an identifier.`
                      );
                    }

                    paramTypes[param.value] = handlerArgType;
                  } else if (handler.params.length > 1) {
                    throw new Error(`Handler must take 0 or 1 parameters.`);
                  }

                  // Infer return types for handler.
                  const handlerReturnType = inferReturnType(
                    handler,
                    paramTypes
                  );

                  if (i === 0) {
                    seenReturnType = handlerReturnType;
                  } else if (!seenReturnType.eq(handlerReturnType)) {
                    // Ensure that all return types match.
                    throw new Error(
                      `Return types for "match" handlers do not match: ${seenReturnType} vs ${handlerReturnType}.`
                    );
                  }
                });

                // If a wildcard handler is omitted, make sure it is appropriate to do so.
                if (!seenTags.includes("_")) {
                  if (unknownExists) {
                    // Wildcard is always required for statically unknown variants.
                    throw new Error(
                      `A wildcard is always required in a handler for a variant that cannot be statically checked.`
                    );
                  } else {
                    const tags = variantType.tags();

                    tags.forEach((expectedTag) => {
                      if (!seenTags.includes(expectedTag)) {
                        throw new Error(
                          `"match" handlers are not exhaustive (missing ${expectedTag})`
                        );
                      }
                    });
                  }
                }

                return seenReturnType;
              })
              .otherwise(() => {
                throw new Error(
                  `${method} is not a valid method on 'variant'.`
                );
              })
          )
          .otherwise(() => {
            throw new Error(
              `Keyword methods on ${kw.keyword()} are not supported.`
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

  const inferReturnType = bindInferReturnType({
    scope,
    typeCheckExp,
    typeCheckNode,
  });

  return parseTypeMethodCall;
};
