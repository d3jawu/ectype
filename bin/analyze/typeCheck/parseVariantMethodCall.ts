import type { Type } from "../../../core/core";
import type { ECCallExpression, ECVariantMethodCall } from "../../types/ECNode";
import type { Typed } from "../../types/Typed";
import type { bindTypeCheckExp } from "./typeCheckExp";

import { match } from "ts-pattern";

import { Str, Unknown } from "../../../core/core.js";

export const bindParseVariantMethodCall = ({
  typeCheckExp,
}: {
  typeCheckExp: ReturnType<typeof bindTypeCheckExp>;
}) => {
  const parseVariantMethodCall = (
    callExp: ECCallExpression
  ): Typed<ECVariantMethodCall> | null => {
    if (callExp.callee.type !== "ECMemberExpression") {
      return null;
    }

    const variantVal = typeCheckExp(callExp.callee.object);
    const variantType = variantVal.ectype;

    if (variantType.baseType !== "variant") {
      return null;
    }

    const memberExp = callExp.callee;
    if (memberExp.property.type === "ECComputed") {
      throw new Error(`Bracket accesses on a variant are forbidden.`);
    }

    const method = memberExp.property.value;

    const args = callExp.arguments;

    return match(method)
      .with("match", (): Typed<ECVariantMethodCall> => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to variant.match but got ${args.length}`
          );
        }

        const handlersMap = args[0].expression;
        if (handlersMap.type !== "ECObjectExpression") {
          throw new Error(
            `Expected argument to variant match to be an object literal.`
          );
        }

        const variantOptions = variantType.options();

        // Check whether any tag in this variant has a type not known statically.
        const unknownExists = variantOptions.some(
          ([_, type]) => type.baseType === "deferred"
        );

        // Do some checking that's common to both known and unknown variant types.
        let seenReturnType: Type = Unknown; // Set to Unknown initially so TypeScript knows it's always initialized.
        let seenProps: string[] = [];
        handlersMap.properties.forEach((prop, i) => {
          if (prop.type === "ECSpreadElement") {
            throw new Error(
              `Spread ... expressions in "match" are not yet implemented.`
            );
          }

          if (prop.type !== "ECKeyValueProperty") {
            throw new Error(`Expected a key-value property in "match".`);
          }

          if (
            prop.key.type !== "Identifier" &&
            prop.key.type !== "StringLiteral"
          ) {
            throw new Error(
              `Handler key in "match" must be an identifier or string literal.`
            );
          }

          const propName = prop.key.value; // constant to make TypeScript happy

          seenProps.push(propName);

          const handlerType = typeCheckExp(prop.value).ectype;
          if (handlerType.baseType !== "fn") {
            throw new Error(`Handler for "match" must be a function.`);
          }

          // TypeScript infers that this can only be Type, why do I have to specify that it can also be null?
          const handlerArgType: Type | null = handlerType.params()[0] || null; // The argument for a "match" handler is optional.
          const handlerReturnType = handlerType.returns();

          if (i === 0) {
            seenReturnType = handlerReturnType;
          } else if (!seenReturnType.eq(handlerReturnType)) {
            // Ensure that all return types match.
            throw new Error(
              `Return types for "match" handlers do not match: ${seenReturnType} vs ${handlerReturnType}.`
            );
          }

          if (propName === "_") {
            // Behavior for the wildcard handler is the same regardless of whether the type is known.
            if (!!handlerArgType && !handlerArgType.eq(Unknown)) {
              throw new Error(
                `Argument for wildcard handler must be of type Unknown (got ${handlerArgType}).`
              );
            }
          } else if (!unknownExists) {
            // Tag type is statically known, so check the argument in the handler against it.
            const variantTag = variantOptions.find(
              ([name]) => name === propName
            );

            if (!variantTag) {
              throw new Error(
                `Tag ${propName} does not exist on ${variantType}.`
              );
            }

            if (!!handlerArgType) {
              // If the handler has an argument, check it against the type in the variant.
              const [_, variantTagType] = variantTag;

              if (!handlerArgType.eq(variantTagType)) {
                throw new Error(
                  `Handler for ${propName} expects ${variantTagType} for argument but got ${handlerArgType}.`
                );
              }
            }
          } // If the type is unknown, allow the handler no matter what argument type it has (since it will be checked at runtime).
        });

        // If a wildcard handler is omitted, make sure it is appropriate to do so.
        if (!seenProps.includes("_")) {
          if (unknownExists) {
            // Wildcard is always required for statically unknown variants.
            throw new Error(
              `A wildcard is always required in a handler for a variant that cannot be statically checked.`
            );
          } else {
            const tags = variantType.tags();

            tags.forEach((expectedTag) => {
              if (!seenProps.includes(expectedTag)) {
                throw new Error(
                  `"match" handlers are not exhaustive (missing ${expectedTag})`
                );
              }
            });
          }
        }

        return {
          type: "ECVariantMethodCall",
          span: callExp.span,
          variant: variantVal,
          method: "match",
          arguments: args.map((arg) => arg.expression),

          ectype: seenReturnType,
        };
      })
      .with("toString", (): Typed<ECVariantMethodCall> => {
        if (args.length !== 0) {
          throw new Error(
            `Expected exactly 0 args to toString but got ${args.length}.`
          );
        }

        return {
          type: "ECVariantMethodCall",
          span: callExp.span,
          variant: variantVal,
          method: "match",
          arguments: [],

          ectype: Str,
        };
      })
      .otherwise((prop) => {
        throw new Error(`${prop} is not a valid variant method.`);
      });
  };

  return parseVariantMethodCall;
};
