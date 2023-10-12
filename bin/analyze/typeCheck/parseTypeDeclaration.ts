import type { Type } from "../../../core/core";
import type {
  ECCallExpression,
  ECExp,
  ECExprOrSpread,
  ECTypeDeclaration,
} from "../../types/ECNode";
import type { Typed } from "../../types/Typed";

import { typeValFrom } from "../typeValFrom.js";

import type { bindTypeCheckExp } from "./typeCheckExp";
import type { bindTypeCheckNode } from "./typeCheckNode";

import {
  Bool,
  array,
  cond,
  fn,
  struct,
  tuple,
  variant,
} from "../../../core/core.js";

import { Scope } from "./typeCheck";

import { bindInferReturnType } from "./inferReturnType.js";

import { match } from "ts-pattern";

// TODO derive this from the exports on core.js, instead of hard-coding?
const isTypeName = (name: string): boolean =>
  ["fn", "tuple", "array", "variant", "struct", "cond"].includes(name);

export const bindParseTypeDeclaration = ({
  scope,
  resolveTypeExp,
  typeCheckExp,
  typeCheckNode,
}: {
  scope: Scope;
  resolveTypeExp: (node: ECExp) => Type;
  typeCheckExp: ReturnType<typeof bindTypeCheckExp>;
  typeCheckNode: ReturnType<typeof bindTypeCheckNode>;
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
        const entryTypes = args
          .map((arg) => arg.expression)
          .map((arg) => resolveTypeExp(arg));

        return typeValFrom(tuple(...entryTypes));
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
      .with("cond", () => {
        if (args.length !== 2) {
          throw new Error(
            `Expected exactly 2 arguments to cond() but got ${args.length}`
          );
        }

        const parentType = resolveTypeExp(args[0].expression);

        const predicate = args[1].expression;
        if (predicate.type !== "ECArrowFunctionExpression") {
          throw new Error(`cond() predicate must be a function.`);
        }

        const predicateParams: Record<string, Type> = {};
        if (predicate.params.length === 1) {
          if (predicate.params[0].type !== "ECIdentifier") {
            throw new Error(`Predicate parameter must be an identifier.`);
          }

          const param = predicate.params[0];

          predicateParams[param.value] = parentType;
        } else if (predicate.params.length > 1) {
          throw new Error(
            `cond() predicate can take at most one param (got ${predicate.params.length}).`
          );
        }

        const inferredReturnType = inferReturnType(predicate, predicateParams);
        if (!inferredReturnType.eq(Bool)) {
          throw new Error(`cond() predicate must return a boolean.`);
        }

        return typeValFrom(
          cond(parentType, () => {
            throw new Error(`Cannot use cond predicate at analysis-time.`);
          })
        );
      })
      .otherwise((t) => {
        throw new Error(`Unimplemented type: ${t}`);
      });

    return {
      span: callExp.span,
      type: "ECTypeDeclaration",
      targetType: targetType as Type["baseType"],
      shape: args.map((arg) => arg.expression),
      ectype,
    };
  };

  const inferReturnType = bindInferReturnType({
    scope,
    typeCheckExp,
    typeCheckNode,
  });

  return parseTypeDeclaration;
};
