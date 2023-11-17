import type { Type } from "../../../core/core";
import type {
  ECCallExpression,
  ECExp,
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
import { ErrorType } from "../../../core/internal.js";
import { disallowPattern } from "./disallowPattern.js";

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
      !isTypeName(callExp.callee.name)
    ) {
      return null;
    }

    const targetType = callExp.callee.name;

    const args = callExp.arguments;

    const ectype = match(targetType)
      .with("fn", () => {
        if (args.length !== 2) {
          throw new Error(
            `Expected exactly 2 arguments to fn() but got ${args.length}`
          );
        }

        const params = args[0];

        if (params.type !== "ECArrayExpression") {
          throw new Error(`First argument to fn() must be an array literal.`);
        }

        const returns = args[1];

        let returnType: Type;
        if (returns.type === "ECSpreadElement") {
          scope.error(
            "NOT_ALLOWED_HERE",
            { syntax: "spread element" },
            returns
          );
          returnType = ErrorType;
        } else {
          returnType = resolveTypeExp(returns);
        }

        const paramTypes: Type[] = params.elements.map((el) => {
          if (el === null) {
            // I'm not sure how this can actually happen.
            scope.error(
              "UNIMPLEMENTED",
              { features: "null array elements" },
              returns
            );
            return ErrorType;
          }

          if (el.type === "ECSpreadElement") {
            scope.error("NOT_ALLOWED_HERE", { syntax: "spread element" }, el);
            return ErrorType;
          }

          return resolveTypeExp(el);
        });

        return typeValFrom(fn(paramTypes, returnType));
      })
      .with("tuple", () => {
        const entryTypes = args.map((arg) => {
          if (arg.type === "ECSpreadElement") {
            scope.error("NOT_ALLOWED_HERE", { syntax: "spread element" }, arg);
            return ErrorType;
          }

          return resolveTypeExp(arg);
        });

        return typeValFrom(tuple(...entryTypes));
      })
      .with("array", () => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to array() but got ${args.length}`
          );
        }

        const containsNode = args[0];

        if (containsNode.type === "ECSpreadElement") {
          throw new Error(`Spread arguments are not allowed in array().`);
        }

        const argType = typeCheckExp(containsNode).ectype;

        if (argType.baseType !== "type") {
          throw new Error(`array() parameter must be a type.`);
        }

        const resolvedType = resolveTypeExp(containsNode);

        return typeValFrom(array(resolvedType));
      })
      .with("variant", () => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to variant() but got ${args.length}`
          );
        }

        const optionsNode = args[0];

        if (optionsNode.type !== "ECObjectExpression") {
          throw new Error(`Argument to struct() must be an object literal.`);
        }

        const options = optionsNode.properties.reduce(
          (acc: Record<string, Type>, prop) => {
            if (prop.type === "ECSpreadElement") {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "spread element" },
                prop
              );
              return acc;
            }

            if (prop.computed || prop.key.type !== "ECIdentifier") {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "computed field" },
                prop
              );
              return acc;
            }

            if (prop.key.name[0] !== prop.key.name[0].toUpperCase()) {
              scope.error(
                "VARIANT_TAG_NAME",
                { received: prop.key.name },
                prop.key,
                "must begin with uppercase letter"
              );
              return acc;
            }

            const value = disallowPattern(prop.value);
            if (!value) {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "destructuring pattern" },
                prop.value
              );
              return acc;
            }

            acc[prop.key.name] = resolveTypeExp(value);

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

        const shapeNode = args[0];

        if (shapeNode.type !== "ECObjectExpression") {
          throw new Error(`struct() parameter must be an object literal.`);
        }

        const shape = shapeNode.properties.reduce(
          (acc: Record<string, Type>, prop) => {
            if (prop.type === "ECSpreadElement") {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "spread element" },
                prop
              );
              return acc;
            }

            if (prop.computed) {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "computed field" },
                prop
              );
              return acc;
            }

            if (prop.key.type !== "ECIdentifier") {
              throw new Error(
                `Cannot use ${prop.key.type} as key in struct shape.`
              );
            }

            const value = disallowPattern(prop.value);
            if (!value) {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "destructuring pattern" },
                prop.value
              );
              return acc;
            }

            acc[prop.key.name] = resolveTypeExp(value);

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

        if (args[0].type === "ECSpreadElement") {
          scope.error(
            "NOT_ALLOWED_HERE",
            { syntax: "spread element" },
            args[0]
          );
          return ErrorType;
        }

        const parentType = resolveTypeExp(args[0]);

        const predicate = args[1];
        if (predicate.type !== "ECArrowFunctionExpression") {
          throw new Error(`cond() predicate must be a function.`);
        }

        const predicateParams: Record<string, Type> = {};
        if (predicate.params.length === 1) {
          if (predicate.params[0].type !== "ECIdentifier") {
            throw new Error(`Predicate parameter must be an identifier.`);
          }

          const param = predicate.params[0];

          predicateParams[param.name] = parentType;
        } else if (predicate.params.length > 1) {
          throw new Error(
            `cond() predicate can take at most one param (got ${predicate.params.length}).`
          );
        }

        const inferredReturnType = inferReturnType(predicate, predicateParams);
        if (
          inferredReturnType.baseType !== "error" &&
          !inferredReturnType.eq(Bool)
        ) {
          scope.error(
            "CONDITION_TYPE_MISMATCH",
            { structure: "cond predicate", received: inferredReturnType },
            predicate
          ); // TODO this should be on the return statements themselves, not the whole function
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
      ...callExp,
      type: "ECTypeDeclaration",
      targetType: targetType as Type["baseType"],
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
