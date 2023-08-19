import type { Type } from "../../../core/types";
import type { ECCallExpression, ECVariantMethodCall } from "../../types/ECNode";
import type { Typed } from "../../types/Typed";
import type { bindTypeCheckExp } from "./typeCheckExp";

import { match } from "ts-pattern";

import { Unknown } from "../../../core/primitives.js";

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
      .with("when", (): Typed<ECVariantMethodCall> => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to variant.when but got ${args.length}`
          );
        }

        const handlersMap = args[0].expression;
        if (handlersMap.type !== "ECObjectExpression") {
          throw new Error(
            `Expected call to variant when to be an object literal.`
          );
        }

        // Ensure all handlers return the same type.
        let seenReturnType: Type = Unknown; // Set to Unknown initially so TypeScript knows it's always initialized.
        let seenProps: string[] = [];
        // TODO: this will have to be refactored (maybe to .find()) when we start returning error objects instead of throwing.
        handlersMap.properties.forEach((prop, i) => {
          if (prop.type === "ECSpreadElement") {
            throw new Error(
              `Spread ... expressions in "when" are not yet implemented.`
            );
          }

          if (prop.type !== "ECKeyValueProperty") {
            throw new Error(`Expected a key-value property in "when".`);
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

          const handlerType = typeCheckExp(prop.value).ectype;
          if (handlerType.baseType !== "fn") {
            throw new Error(`Handler for "when" must be a function.`);
          }

          const handlerReturnType = handlerType.returns();

          if (i === 0) {
            seenReturnType = handlerReturnType;
          } else if (!handlerReturnType.eq(seenReturnType)) {
            throw new Error(
              `Expected type ${seenReturnType} but got ${handlerReturnType}`
            );
          }

          return true;
        });

        // Ensure that match coverage is exhaustive or uses
        const tags = variantType.tags();
        if (!seenProps.includes("_")) {
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

        return {
          type: "ECVariantMethod",
          span: callExp.span,
          variant: variantVal,
          method: "when",
          arguments: args.map((arg) => arg.expression),

          ectype: seenReturnType,
        };
      })
      .otherwise((prop) => {
        throw new Error(`${prop} is not a valid variant method.`);
      });
  };

  return parseVariantMethodCall;
};
