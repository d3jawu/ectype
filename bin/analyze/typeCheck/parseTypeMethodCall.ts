import type {
  ECArrowFunctionExpression,
  ECCallExpression,
  ECExp,
  ECTypeMethodCall,
} from "../../types/ECNode";
import type { Typed } from "../../types/Typed";

import type { FnType, FnaType, Type } from "../../../core/internal.js";

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

import { Deferred, ErrorType } from "../../../core/internal.js";

import { option } from "../../../lib/option.js";

import { match } from "ts-pattern";
import { disallowPattern } from "./disallowPattern.js";
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
    callExp: ECCallExpression,
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

    if (typeof memberExp.property !== "string") {
      scope.error("NOT_ALLOWED_HERE", { syntax: "computed field" }, memberExp);
      return null; // TODO I am not sure this is the correct behavior.
    }

    const method = memberExp.property;

    if (
      callExp.arguments.some((arg) => {
        if (arg.type === "ECSpreadElement") {
          scope.error("NOT_ALLOWED_HERE", { syntax: "spread element" }, arg);
          return true;
        } else {
          return false;
        }
      })
    ) {
      return null;
    }
    const args = callExp.arguments as ECExp[];

    // Reusable handler for the "eq" method (which is the same across all types.)
    const handleEq = () => {
      if (args.length !== 1) {
        throw new Error(
          `Expected exactly 1 argument to eq but got ${args.length}`,
        );
      }

      // TODO warn if the eq() is always true or false (which is the case if both types are known statically).

      const argType = typeCheckExp(args[0]).ectype;

      if (argType.baseType !== "type") {
        throw new Error(`Argument to eq() must be a type.`);
      }

      return Bool;
    };

    // Reusable handler for the "valid" method (which is the same across all types.)
    const handleValid = () => {
      if (args.length !== 1) {
        scope.error(
          "ARG_COUNT_MISMATCH",
          { received: args.length, expected: 1 },
          callExp,
        );
      }
      // TODO warn if valid() is always true or false (which is the case if both types are known statically).
      return Bool;
    };

    const handleToString = () => {
      if (args.length !== 0) {
        scope.error(
          "ARG_COUNT_MISMATCH",
          { received: args.length, expected: 0 },
          callExp,
        );
      }

      return Str;
    };

    const ectype = match(targetType.type()) // Note that we are matching against the underlying type.
      .with({ baseType: "null" }, () =>
        match(method)
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to null.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Null.`);
          }),
      )
      .with({ baseType: "bool" }, () =>
        match(method)
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to bool.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("eq", handleEq)
          .with("valid", handleValid)
          .otherwise(() => {
            scope.error(
              "INVALID_TYPE_METHOD",
              { name: method, baseType: "bool" },
              memberExp,
            );
            return ErrorType;
          }),
      )
      .with({ baseType: "num" }, () =>
        match(method)
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to num.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to Num.conform but got ${args.length}`,
              );
            }

            return option(Num);
          })
          .with("eq", handleEq)
          .with("valid", handleValid)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Num.`);
          }),
      )
      .with({ baseType: "str" }, () =>
        match(method)
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to str.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to Num.conform but got ${args.length}`,
              );
            }

            return option(Str);
          })
          .with("eq", handleEq)
          .with("valid", handleValid)
          .otherwise(() => {
            throw new Error(`${method} is not a valid method on Str.`);
          }),
      )
      .with({ baseType: "fn" }, { baseType: "fna" }, (fnxType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              scope.error(
                "ARG_COUNT_MISMATCH",
                {
                  received: args.length,
                  expected: 1,
                },
                callExp,
              );
              return fnxType;
            }

            const literalNode = args[0];

            if (literalNode.type !== "ECArrowFunctionExpression") {
              scope.error(
                "MISSING_EXPECTED",
                { syntax: "arrow function literal" },
                literalNode,
              );
              return fnxType;
            }

            if (fnxType.baseType === "fn" && literalNode.async) {
              scope.error(
                "ASYNC_MISMATCH",
                { expected: "synchronous" },
                literalNode,
              );
              return fnxType;
            }

            if (fnxType.baseType === "fna" && !literalNode.async) {
              scope.error("ASYNC_MISMATCH", { expected: "async" }, literalNode);
              return fnxType;
            }

            typeCheckFn(literalNode, fnxType);

            return fnxType;
          })
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to fn.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("eq", handleEq)
          .with("conform", () => {
            scope.error(
              "INVALID_TYPE_METHOD",
              { name: "conform", baseType: fnxType.baseType },
              memberExp,
              "a function cannot be conformed at runtime",
            );

            // It's not valid, but we still know what type the user meant.
            return option(fnxType);
          })
          .otherwise(() => {
            scope.error(
              "INVALID_TYPE_METHOD",
              { name: method, baseType: fnxType.baseType },
              memberExp,
            );

            return ErrorType;
          }),
      )
      .with({ baseType: "tuple" }, (tupleType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to tuple.from but got ${args.length}`,
              );
            }

            const literalNode = args[0];

            if (literalNode.type !== "ECArrayExpression") {
              throw new Error(
                `tuple.from() argument must be an array literal.`,
              );
            }

            const shape = literalNode.elements.reduce((acc: Type[], el) => {
              if (!el) {
                return acc;
              }

              if (el.type === "ECSpreadElement") {
                scope.error(
                  "NOT_ALLOWED_HERE",
                  { syntax: "spread element" },
                  el,
                );
                return [...acc, ErrorType];
              }

              return [...acc, typeCheckExp(el).ectype];
            }, []);

            const inputType = tuple(...shape);

            if (!inputType.eq(tupleType)) {
              throw new Error(
                `Invalid cast to tuple type: ${inputType} vs ${tupleType}`,
              );
            }

            return tupleType;
          })
          .with("valid", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to tuple.valid but got ${args.length}`,
              );
            }

            return Bool;
          })
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to tuple.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("eq", handleEq)
          .with("field", () => {
            throw new Error(`tuple.field cannot be used at runtime.`);
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid tuple operation.`);
          }),
      )
      .with({ baseType: "array" }, (arrayType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to array.from but got ${args.length}`,
              );
            }

            const literalNode = args[0];

            if (literalNode.type !== "ECArrayExpression") {
              throw new Error(
                `array.from() argument must be an array literal.`,
              );
            }

            literalNode.elements.forEach((el, i) => {
              if (!el) {
                return;
              }

              if (el.type === "ECSpreadElement") {
                scope.error(
                  "NOT_ALLOWED_HERE",
                  { syntax: "spread element" },
                  el,
                );
                return ErrorType;
              }

              const elType = typeCheckExp(el).ectype;

              if (
                elType.baseType !== "error" &&
                !elType.eq(arrayType.contains())
              ) {
                scope.error(
                  "ARG_TYPE_MISMATCH",
                  { n: i, expected: arrayType.contains(), received: elType },
                  el,
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
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to array.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("contains", () => {
            if (args.length !== 0) {
              scope.error(
                "ARG_COUNT_MISMATCH",
                { received: args.length, expected: 0 },
                callExp,
              );
            }

            return Bool;
          })
          .with("eq", handleEq)
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid array operation.`);
          }),
      )
      .with({ baseType: "cond" }, (condType) =>
        match(method)
          .with("from", () => {
            scope.error(
              "INVALID_TYPE_METHOD",
              { name: "from", baseType: "cond" },
              memberExp,
              "a conditional type cannot be statically checked",
            );

            // We still know what type the user meant here.
            return condType;
          })
          .with("conform", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to cond.conform but got ${args.length}`,
              );
            }

            return option(condType);
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid array operation.`);
          }),
      )
      .with({ baseType: "struct" }, (structType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.from but got ${args.length}`,
              );
            }

            const literalNode = args[0];

            if (literalNode.type !== "ECObjectExpression") {
              throw new Error(
                `struct.from() parameter must be an object literal.`,
              );
            }

            const shape = literalNode.properties.reduce(
              (acc: Record<string, Type>, prop) => {
                if (prop.type === "ECSpreadElement") {
                  scope.error(
                    "NOT_ALLOWED_HERE",
                    { syntax: "spread element" },
                    prop,
                  );
                  return acc;
                }

                if (typeof prop.key !== "string") {
                  scope.error(
                    "NOT_ALLOWED_HERE",
                    { syntax: "computed field" },
                    prop,
                  );
                  return acc;
                }

                const value = disallowPattern(prop.value);
                if (!value) {
                  scope.error(
                    "UNIMPLEMENTED",
                    { features: "pattern values in struct.from()" },
                    prop.value,
                  );
                  return acc;
                }

                acc[prop.key] = typeCheckExp(value).ectype;

                return acc;
              },
              {},
            );

            const inputType = struct(shape);

            if (!inputType.eq(structType)) {
              // TODO explain incompatibility in error message
              scope.error(
                "FROM_TYPE_MISMATCH",
                { received: inputType, expected: structType },
                literalNode, // TODO put error directly on incorrect field(s)
              );

              // Still safe to return structType, since that's defined elsewhere
              // and most likely what the user wanted when they called "from".
            }

            return structType;
          })
          .with("conform", () => {
            if (args.length !== 1) {
              scope.error(
                "ARG_COUNT_MISMATCH",
                { received: args.length, expected: 1 },
                memberExp,
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
                `Expected exactly 1 argument to struct.valid but got ${args.length}`,
              );
            }

            return Bool;
          })
          .with("has", () => {
            throw new Error(`Not yet implemented.`);

            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to struct.has but got ${args.length}`,
              );
            }

            return Bool;
          })
          .with("fields", () => {
            throw new Error(`Not yet implemented.`);

            // map type needs to be implemented first
          })
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to struct.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("eq", handleEq)
          .with("toString", () => {
            if (args.length !== 0) {
              throw new Error(
                `Expected exactly no arguments to struct.toString but got ${args.length}`,
              );
            }

            return Str;
          })
          .with("get", () => {
            throw new Error(`struct.get cannot be used at runtime.`);
          })
          .otherwise(() => {
            throw new Error(`'${method}' is not a valid struct operation.`);
          }),
      )
      .with({ baseType: "objectMap" }, (objectMapType) =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              scope.error(
                "ARG_COUNT_MISMATCH",
                { received: args.length, expected: 1 },
                callExp,
              );
              return objectMapType;
            }

            const literalNode = args[0];

            if (literalNode.type !== "ECObjectExpression") {
              scope.error(
                "MISSING_EXPECTED",
                { syntax: "object literal" },
                literalNode,
              );
              return objectMapType;
            }

            for (let prop of literalNode.properties) {
              if (prop.type === "ECSpreadElement") {
                scope.error(
                  "NOT_ALLOWED_HERE",
                  { syntax: "spread element" },
                  prop,
                );
                return objectMapType;
              }

              const val = disallowPattern(prop.value);
              if (val === null) {
                scope.error(
                  "NOT_ALLOWED_HERE",
                  { syntax: "destructuring pattern" },
                  prop.value,
                );
                return objectMapType;
              }

              const valType = typeCheckExp(val).ectype;

              if (!valType.eq(objectMapType.contains())) {
                scope.error(
                  "CONTAINED_TYPE_MISMATCH",
                  { contained: objectMapType.contains(), received: valType },
                  prop.value,
                );
                return objectMapType;
              }
            }

            return objectMapType;
          })
          .with("eq", handleEq)
          .with("valid", handleValid)
          .with("conform", () => {
            if (args.length !== 1) {
              scope.error(
                "ARG_COUNT_MISMATCH",
                { received: args.length, expected: 1 },
                callExp,
              );
            }

            return option(objectMapType);
          })
          .with("contains", () => {
            if (args.length !== 0) {
              scope.error(
                "ARG_COUNT_MISMATCH",
                { received: args.length, expected: 0 },
                callExp,
              );
            }

            return Bool;
          })
          .with("toString", handleToString)
          .otherwise(() => {
            scope.error(
              "INVALID_TYPE_METHOD",
              { name: method, baseType: "objectMap" },
              memberExp,
            );
            return ErrorType;
          }),
      )
      .with({ baseType: "variant" }, (variantType) =>
        match(method)
          // .with("sub", () => {
          //   if (args.length !== 1) {
          //     throw new Error(
          //       `Expected exactly 1 argument to variant.sub but got ${args.length}`
          //     );
          //   }

          //   const argType = typeCheckExp(args[0]).ectype;

          //   if (argType.baseType !== "type") {
          //     throw new Error(`Argument to sub() must be a type.`);
          //   }

          //   return Bool;
          // })
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to variant.from but got ${args.length}`,
              );
            }

            const arg = args[0];
            if (arg.type !== "ECObjectExpression") {
              throw new Error(
                `Argument to variant.from must be an object literal.`,
              );
            }

            if (arg.properties.length !== 1) {
              throw new Error(
                `Argument to variant.from must have exactly one key set.`,
              );
            }

            const prop = arg.properties[0];

            if (prop.type === "ECSpreadElement") {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "spread element" },
                prop,
              );
              return variantType;
            }

            if (typeof prop.key !== "string") {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "computed field" },
                prop.key,
              );
              return variantType;
            }

            const { key } = prop;

            if (!variantType.has(key)) {
              scope.error("VARIANT_TAG_NAME", { received: key }, prop);
              return variantType;
            }

            const value = disallowPattern(prop.value);

            if (value === null) {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "destructuring pattern" },
                prop.value,
              );
              return variantType;
            }

            const valueType = typeCheckExp(value).ectype;

            if (
              valueType.baseType !== "error" &&
              !valueType.eq(variantType.get(key))
            ) {
              scope.error(
                "KEY_TYPE_MISMATCH",
                {
                  key: key,
                  received: valueType,
                  expected: variantType.get(key),
                },
                value,
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
          }),
      )
      .with({ baseType: "type" }, (typeType) => {
        // Since Type is its own type (calling type() on Type returns Type), it has the same type (Type) as a runtime type-value, e.g. the return value of a fn([Type], Type),
        // both cases will have the same type signature in the analyzer.
        // To disambiguate, we have to manually check if the value being read is Type itself.
        // This does depend on the user being unable to create their own new references to Type.
        // TODO revisit this. Renamed references to Type are always possible through function calls.
        if (typeVal.type === "ECIdentifier" && typeVal.name === "Type") {
          // Type constant
          return match(method)
            .with("from", () => {
              if (args.length !== 1) {
                throw new Error(
                  `Expected exactly 1 argument to type.from but got ${args.length}`,
                );
              }

              const argType = typeCheckExp(args[0]).ectype;

              if (argType.baseType !== "type") {
                scope.error(
                  "FROM_TYPE_MISMATCH",
                  { expected: TypeType, received: argType },
                  args[0],
                );
                // Still safe to return TypeType, since that's likely what the
                // user meant when they called Type.from.
              }

              return TypeType;
            })
            .with("conform", () => {
              scope.error(
                "INVALID_TYPE_METHOD",
                { name: "conform", baseType: "type" },
                memberExp,
              );

              // We still know what type the user meant, even if it's not allowed.
              return option(TypeType);
            })
            .otherwise(() => {
              scope.error(
                "INVALID_TYPE_METHOD",
                { name: method, baseType: "type" },
                memberExp,
              );
              return ErrorType;
            });
        } else {
          throw new Error(
            `Internal error: a type's underlying type cannot be Type.`,
          );
        }
      })
      .with({ baseType: "unknown" }, () =>
        match(method)
          .with("from", () => {
            if (args.length !== 1) {
              throw new Error(
                `Expected exactly 1 argument to unknown.from but got ${args.length}`,
              );
            }

            // Casting to Unknown always succeeds.

            return Unknown;
          })
          .with("eq", handleEq)
          .with("valid", handleValid)
          .otherwise(() => {
            throw new Error(`${method} is not a valid function on Unknown`);
          }),
      )
      .with({ baseType: "deferred" }, () =>
        match(method)
          .with("from", () => {
            throw new Error(
              `"from" cannot be used with a type that is not known statically.`,
            );
          })
          .with("conform", () => {
            return option(Deferred);
          })
          .otherwise(() => {
            throw new Error(
              `${method} is not a valid function on a Deferred type.`,
            );
          }),
      )
      .with({ baseType: "keyword" }, (kw) =>
        match(kw.keyword())
          .with("variant", () =>
            match(method)
              .with("match", () => {
                if (args.length !== 2) {
                  throw new Error(
                    `Expected exactly 2 arguments to variant match but got ${args.length}.`,
                  );
                }

                const variantVal = typeCheckExp(args[0]);
                const variantType = variantVal.ectype;
                if (variantType.baseType !== "variant") {
                  throw new Error(
                    `First argument to variant match must be a variant.`,
                  );
                }

                const handlersMap = args[1];
                if (handlersMap.type !== "ECObjectExpression") {
                  throw new Error(
                    `Second argument to variant match should be an object mapping tags to handlers.`,
                  );
                }

                const variantOptions = variantType.options();

                let unknownExists = false;

                let seenReturnType: Type = Unknown; // Set to Unknown initially so TypeScript knows it's always initialized.
                let seenTags: string[] = [];
                handlersMap.properties.forEach((prop, i) => {
                  if (prop.type === "ECSpreadElement") {
                    scope.error(
                      "NOT_ALLOWED_HERE",
                      { syntax: "spread element" },
                      prop,
                    );
                    return;
                  }

                  if (typeof prop.key !== "string") {
                    throw new Error(
                      `Handler key in "match" must be an identifier or string literal.`,
                    );
                  }

                  const tagName = prop.key; // constant to make TypeScript happy

                  if (
                    !variantOptions.some(([t]) => tagName === t) &&
                    tagName !== "_"
                  ) {
                    scope.error(
                      "VARIANT_TAG_NAME",
                      { received: tagName },
                      prop,
                      `does not exist in ${variantType}`,
                    );
                    return;
                  }

                  seenTags.push(tagName);

                  let _handlerArgType: Type;
                  let _handler: ECArrowFunctionExpression;
                  // Handler can either be a function or tuple of [assertedType, handler]
                  if (tagName === "_") {
                    _handlerArgType = Unknown;
                    if (prop.value.type !== "ECArrowFunctionExpression") {
                      throw new Error(
                        `Wildcard handler cannot take a type assertion.`,
                      );
                    }
                    _handler = prop.value;
                  } else if (prop.value.type === "ECArrowFunctionExpression") {
                    // Known param type - use the type from the variant.
                    _handlerArgType = variantOptions.find(
                      ([t]) => t === tagName,
                    )![1]; // Guaranteed to find, because we have already eliminated the case where the tag is not in the variant.
                    _handler = prop.value;
                  } else if (prop.value.type === "ECArrayExpression") {
                    if (
                      variantOptions.find(([t]) => t === tagName)![1]
                        .baseType !== "deferred"
                    ) {
                      // TODO warning
                      // throw new Error(
                      // `Type assertion is unnecessary on ${tagName} because its type is known statically.`
                      // );
                    }

                    // Asserted param type - use the type from the assertion.
                    if (prop.value.elements.length !== 2) {
                      throw new Error(
                        `Type assertion in match must have (only) type and handler.`,
                      );
                    }

                    const el = prop.value.elements[0];

                    if (el === null) {
                      // I'm not actually sure how this can ever happen.
                      scope.error(
                        "UNIMPLEMENTED",
                        { features: "null array elements" },
                        prop.value,
                      );
                      return ErrorType; // TODO may be more specific
                    }

                    if (el.type === "ECSpreadElement") {
                      scope.error(
                        "NOT_ALLOWED_HERE",
                        { syntax: "spread element" },
                        el,
                      );
                      return ErrorType; // TODO may be more specific
                    }

                    const assertedType = resolveTypeExp(el);

                    _handlerArgType = assertedType;

                    if (
                      prop.value.elements[1]?.type !==
                      "ECArrowFunctionExpression"
                    ) {
                      throw new Error(
                        `Second value in match assertion must be a handler function.`,
                      );
                    }

                    _handler = prop.value.elements[1];
                    unknownExists = true;
                  } else {
                    throw new Error(
                      `Expected either a handler function or type assertion (got ${prop.value.type}).`,
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
                        `Handler parameter must be an identifier.`,
                      );
                    }

                    paramTypes[param.name] = handlerArgType;
                  } else if (handler.params.length > 1) {
                    throw new Error(`Handler must take 0 or 1 parameters.`);
                  }

                  // Infer return types for handler.
                  const handlerReturnType = inferReturnType(
                    handler,
                    paramTypes,
                  );

                  if (i === 0) {
                    seenReturnType = handlerReturnType;
                  } else if (
                    seenReturnType.baseType !== "error" &&
                    !seenReturnType.eq(handlerReturnType)
                  ) {
                    // Ensure that all return types match.
                    scope.error(
                      "RETURN_TYPE_MISMATCH",
                      {
                        seen: seenReturnType,
                        received: handlerReturnType,
                      },
                      handler,
                    ); // TODO this should be on the faulty return, not the whole handler
                  }
                });

                // If a wildcard handler is omitted, make sure it is appropriate to do so.
                if (!seenTags.includes("_")) {
                  if (unknownExists) {
                    // Wildcard is always required for statically unknown variants.
                    throw new Error(
                      `A wildcard is always required in a handler for a variant that cannot be statically checked.`,
                    );
                  } else {
                    const tags = variantType.tags();

                    tags.forEach((expectedTag) => {
                      if (!seenTags.includes(expectedTag)) {
                        scope.error(
                          "MATCH_HANDLER_MISSING",
                          { missing: expectedTag },
                          args[1],
                        );
                        // Can still continue parsing
                      }
                    });
                  }
                }

                return seenReturnType;
              })
              .otherwise(() => {
                throw new Error(
                  `${method} is not a valid method on 'variant'.`,
                );
              }),
          )
          .otherwise(() => {
            throw new Error(
              `Keyword methods on ${kw.keyword()} are not supported.`,
            );
          }),
      )
      .otherwise(() => {
        scope.error(
          "UNIMPLEMENTED",
          { features: `type methods on ${targetType.type().baseType}` },
          memberExp,
        );
        return ErrorType;
      });

    return {
      ...callExp,
      type: "ECTypeMethodCall",
      targetType: targetType.baseType,
      method,
      arguments: args,
      ectype,
    };
  };

  // Checks a bare function's parameter and return types against an expected function type.
  const typeCheckFn = (
    fnNode: ECArrowFunctionExpression,
    fnxType: FnType | FnaType,
  ) => {
    const expectedParams = fnxType.params();

    if (expectedParams.length !== fnNode.params.length) {
      throw new Error(
        `Expected ${expectedParams.length} parameters but implementation has ${fnNode.params.length}.`,
      );
    }

    const paramTypes: Record<string, Type> = {};
    fnNode.params.forEach((param, i) => {
      if (param.type !== "ECIdentifier") {
        throw new Error(
          `Function parameters other than identifiers are not yet implemented (got ${param.type})`,
        );
      }

      paramTypes[param.name] = expectedParams[i];
    });

    const inferredReturnType = inferReturnType(fnNode, paramTypes);
    if (
      inferredReturnType.baseType !== "error" &&
      !inferredReturnType.eq(fnxType.returns())
    ) {
      scope.error(
        "RETURN_TYPE_MISMATCH",
        { seen: fnxType.returns(), received: inferredReturnType },
        fnNode,
      ); // TODO error should be on faulty return, not the entire function
    }
  };

  const inferReturnType = bindInferReturnType({
    scope,
    typeCheckExp,
    typeCheckNode,
  });

  return parseTypeMethodCall;
};
