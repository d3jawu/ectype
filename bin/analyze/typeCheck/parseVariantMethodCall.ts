import type { Type } from "../../../core/types";
import type { ECCallExpression, ECVariantMethodCall } from "../../types/ECNode";
import type { Typed } from "../../types/Typed";
import type { bindTypeCheckExp } from "./typeCheckExp";

import { match } from "ts-pattern";

import { Void } from "../../../core/primitives.js";

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

    if (variantType.__ktype__ !== "variant") {
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
        let seenReturnType: Type = Void; // Set to Void initially so TypeScript knows it's always initialized.
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
        const tags = variantType.tags();
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

        // TODO this should already not be the case, but TS isn't picking it up for some reason. Will go away with cleanup.
        // if (callExp.callee.type === "Import") {
        //   throw new Error(`import() is not a valid variant method.`);
        // }

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
