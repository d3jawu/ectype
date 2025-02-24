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
  Unknown,
  array,
  cond,
  fn,
  fna,
  struct,
  objectMap,
  tuple,
  variant,
} from "../../../core/core.js";

import { Scope } from "./typeCheck";

import { bindCheckReturnType } from "./checkReturnType.js";

import { match } from "ts-pattern";
import { ErrorType, TypeType } from "../../../core/internal.js";
import { disallowPattern } from "./disallowPattern.js";

// TODO derive this from the exports on core.js, instead of hard-coding?
const isTypeKeyword = (name: string): boolean =>
  [
    "fn",
    "fna",
    "tuple",
    "array",
    "variant",
    "struct",
    "objectMap",
    "cond",
  ].includes(name);

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
    callExp: ECCallExpression,
  ): Typed<ECTypeDeclaration> | null => {
    if (
      callExp.callee.type !== "ECIdentifier" ||
      !isTypeKeyword(callExp.callee.name)
    ) {
      return null;
    }

    const targetType = callExp.callee.name;

    const args = callExp.arguments;

    const ectype = match(targetType)
      .with("fn", "fna", (baseType) => {
        if (args.length !== 2) {
          throw new Error(
            `Expected exactly 2 arguments to ${baseType}() but got ${args.length}`,
          );
        }

        const params = args[0];

        if (params.type !== "ECArrayExpression") {
          throw new Error(
            `First argument to ${baseType}() must be an array literal.`,
          );
        }

        const returns = args[1];

        let returnType: Type;
        if (returns.type === "ECSpreadElement") {
          scope.error(
            "NOT_ALLOWED_HERE",
            { syntax: "spread element" },
            returns,
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
              returns,
            );
            return ErrorType;
          }

          if (el.type === "ECSpreadElement") {
            scope.error("NOT_ALLOWED_HERE", { syntax: "spread element" }, el);
            return ErrorType;
          }

          return resolveTypeExp(el);
        });

        if (baseType === "fna") {
          return typeValFrom(fna(paramTypes, returnType));
        } else {
          return typeValFrom(fn(paramTypes, returnType));
        }
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
          scope.error(
            "ARG_COUNT_MISMATCH",
            { received: args.length, expected: 1 },
            callExp,
          );
          return ErrorType;
        }

        const containsNode = args[0];

        if (containsNode.type === "ECSpreadElement") {
          scope.error(
            "NOT_ALLOWED_HERE",
            { syntax: "spread element" },
            args[0],
          );
          return ErrorType;
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
            `Expected exactly 1 argument to variant() but got ${args.length}`,
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

            if (prop.key[0] !== prop.key[0].toUpperCase()) {
              scope.error(
                "VARIANT_TAG_NAME",
                { received: prop.key },
                prop,
                "must begin with uppercase letter",
              );
              return acc;
            }

            const value = disallowPattern(prop.value);
            if (!value) {
              scope.error(
                "NOT_ALLOWED_HERE",
                { syntax: "destructuring pattern" },
                prop.value,
              );
              return acc;
            }

            acc[prop.key] = resolveTypeExp(value);

            return acc;
          },
          {},
        );

        return typeValFrom(variant(options));
      })
      .with("struct", () => {
        if (args.length !== 1) {
          throw new Error(
            `Expected exactly 1 argument to struct() but got ${args.length}`,
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
                "NOT_ALLOWED_HERE",
                { syntax: "destructuring pattern" },
                prop.value,
              );
              return acc;
            }

            acc[prop.key] = resolveTypeExp(value);

            return acc;
          },
          {},
        );

        return typeValFrom(struct(shape));
      })
      .with("objectMap", () => {
        if (args.length !== 1) {
          scope.error(
            "ARG_COUNT_MISMATCH",
            { received: args.length, expected: 1 },
            callExp,
          );
          return ErrorType;
        }

        const containsNode = args[0];

        if (containsNode.type === "ECSpreadElement") {
          scope.error(
            "NOT_ALLOWED_HERE",
            { syntax: "spread element" },
            args[0],
          );
          return ErrorType;
        }

        const argType = typeCheckExp(containsNode).ectype;

        if (argType.baseType !== "type") {
          scope.error(
            "ARG_TYPE_MISMATCH",
            { n: 0, received: argType, expected: typeValFrom(Unknown) }, // not sure "expected" is right here
            args[0],
          );
          return ErrorType;
        }

        const resolvedType = resolveTypeExp(containsNode);

        return typeValFrom(objectMap(resolvedType));
      })
      .with("cond", () => {
        if (args.length !== 2) {
          scope.error(
            "ARG_COUNT_MISMATCH",
            { received: args.length, expected: 2 },
            callExp,
          );
          return ErrorType;
        }

        if (args[0].type === "ECSpreadElement") {
          scope.error(
            "NOT_ALLOWED_HERE",
            { syntax: "spread element" },
            args[0],
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
            `cond() predicate can take at most one param (got ${predicate.params.length}).`,
          );
        }

        const inferredReturnType = checkReturnType(predicate, predicateParams);
        if (
          inferredReturnType.baseType !== "error" &&
          !inferredReturnType.eq(Bool)
        ) {
          scope.error(
            "CONDITION_TYPE_MISMATCH",
            { structure: "cond predicate", received: inferredReturnType },
            predicate,
          ); // TODO this should be on the return statements themselves, not the whole function
        }

        return typeValFrom(
          cond(parentType, () => {
            throw new Error(`Cannot use cond predicate at analysis-time.`);
          }),
        );
      })
      .otherwise((t) => {
        scope.error(
          "UNIMPLEMENTED",
          { features: `declarations for ${t}` },
          callExp.callee,
        );
        return ErrorType;
      });

    return {
      ...callExp,
      type: "ECTypeDeclaration",
      targetType: targetType as Type["baseType"],
      ectype,
    };
  };

  const checkReturnType = bindCheckReturnType({
    scope,
    typeCheckExp,
    typeCheckNode,
  });

  return parseTypeDeclaration;
};
