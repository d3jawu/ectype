import type { Type } from "../../../core/core";
import type {
  ECCallExpression,
  ECExp,
  ECExprOrSpread,
  ECTypeDeclaration,
} from "../../types/ECNode";
import type { Typed } from "../../types/Typed";

import { typeValFrom } from "../typeValFrom.js";

import { bindTypeCheckExp } from "./typeCheckExp";

import { match } from "ts-pattern";
import { array, fn, struct, tuple, variant } from "../../../core/core.js";

const isTypeName = (name: string): boolean =>
  ["fn", "tuple", "array", "variant", "struct"].includes(name);

export const bindParseTypeDeclaration = ({
  resolveTypeExp,
  typeCheckExp,
}: {
  resolveTypeExp: (node: ECExp) => Type;
  typeCheckExp: ReturnType<typeof bindTypeCheckExp>;
}) => {
  // Returns an ECTypedeclaration if call was a type declaration, e.g. struct({}), or null otherwise.
  const parseTypeDeclaration = (
    callExp: ECCallExpression
  ): Typed<ECTypeDeclaration> | null => {
    if (
      callExp.callee.type !== "ECIdentifier" ||
      !isTypeName(callExp.callee.value)
    ) {
      return null;
    }

    const targetType = callExp.callee.value;

    const args = callExp.arguments;

    const ectype = match(targetType)
      .with("fn", () => {
        if (args.length !== 2) {
          throw new Error(
            `Expected exactly 2 arguments to fn() but got ${args.length}`
          );
        }

        const paramsNode = args[0].expression;

        if (paramsNode.type !== "ECArrayExpression") {
          throw new Error(`First argument to fn() must be an array literal.`);
        }

        const returnsNode = args[1].expression;

        const paramTypes = (<ECExprOrSpread[]>(
          paramsNode.elements.filter((el) => !!el)
        )).map((el) => resolveTypeExp(el.expression));
        const returnType = resolveTypeExp(returnsNode);

        return typeValFrom(fn(paramTypes, returnType));
      })
      .with("tuple", () => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to tuple() but got ${args.length}`
          );
        }

        const entriesNode = args[0].expression;

        if (entriesNode.type !== "ECArrayExpression") {
          throw new Error(`Argument to tuple() must be an array literal.`);
        }

        const entryTypes = (<ECExprOrSpread[]>(
          entriesNode.elements.filter((el) => !!el)
        )).map((el) => resolveTypeExp(el.expression));

        return typeValFrom(tuple(entryTypes));
      })
      .with("array", () => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to array() but got ${args.length}`
          );
        }

        const containsNode = args[0];

        if (containsNode.spread) {
          throw new Error(`Spread arguments are not allowed in array().`);
        }

        const argType = typeCheckExp(containsNode.expression).ectype;

        if (argType.baseType !== "type") {
          throw new Error(`array() parameter must be a type.`);
        }

        const resolvedType = resolveTypeExp(containsNode.expression);

        return typeValFrom(array(resolvedType));
      })
      .with("variant", () => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to variant() but got ${args.length}`
          );
        }

        const optionsNode = args[0].expression;

        if (optionsNode.type !== "ECObjectExpression") {
          throw new Error(`Argument to struct() must be an object literal.`);
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
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to struct() but got ${args.length}`
          );
        }

        const shapeNode = args[0].expression;

        if (shapeNode.type !== "ECObjectExpression") {
          throw new Error(`struct() parameter must be an object literal.`);
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

    return {
      span: callExp.span,
      type: "ECTypeDeclaration",
      targetType: targetType as Type["baseType"],
      shape: args.map((arg) => arg.expression),
      ectype,
    };
  };

  return parseTypeDeclaration;
};
