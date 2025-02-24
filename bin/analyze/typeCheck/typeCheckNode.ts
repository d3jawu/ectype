import type { Scope } from "./typeCheck.js";

import { ECExp, ECNode } from "../../types/ECNode.js";

import { analyzeFile, coreTypeMap } from "../analyzeFile.js";

import { match } from "ts-pattern";

import { dirname, join as joinPaths } from "path";

import { Bool, Type } from "../../../core/core.js";
import { bindTypeCheckExp } from "./typeCheckExp.js";
import { ErrorType } from "../../../core/internal.js";

export const bindTypeCheckNode = ({
  path,
  scope,
  exports,
}: {
  path: string;
  scope: Scope;
  exports: Record<string, Type>;
}) => {
  const typeCheckNode = (node: ECNode) =>
    match<ECNode, void>(node)
      .with(
        { type: "BreakStatement" },
        { type: "ContinueStatement" },
        { type: "DebuggerStatement" },
        { type: "EmptyStatement" },
        () => {},
      )
      .with({ type: "ECImportDeclaration" }, (node) => {
        // Bypass imports from ectype itself
        if (node.source === "ectype") {
          node.specifiers.forEach((specifier) => {
            scope.current.set(specifier.local, coreTypeMap[specifier.local]);
          });

          return;
        }

        if (typeof node.source !== "string") {
          throw new Error(
            "How is it even possible to have a non-string import path. This throw only exists to make TypeScript happy",
          );
        }

        // For now, just don't check packages (since no packages that use Ectype exist.)
        if (!node.source.startsWith(".") && !node.source.startsWith("/")) {
          return;
        }

        const result = (() => {
          try {
            return analyzeFile(joinPaths(dirname(path), node.source));
          } catch (cause) {
            throw new Error(
              `Failed to import ${joinPaths(dirname(path), node.source)} (as ${
                node.source
              }) from ${path}`,
              { cause },
            );
          }
        })();

        if (result === null) {
          // File was not an Ectype file; do nothing.
          return;
        }

        const { exports: importedTypes, errors } = result;
        scope.importErrors(errors);

        node.specifiers.forEach((specifier) => {
          const remoteName = specifier.imported;
          const localName = specifier.local;

          if (!importedTypes[remoteName]) {
            throw new Error(`${remoteName} is not exported by ${node.source}.`);
          }

          scope.current.set(localName, importedTypes[remoteName]);
        });
      })
      .with({ type: "ECExportNamedDeclaration" }, (node) => {
        node.specifiers.forEach((specifier) => {
          const exportedType = scope.current.get(specifier.local);
          if (exportedType === null) {
            throw new Error(
              `Could not export ${specifier.local} because it is not defined.`,
            );
          }

          const exportedName = specifier.exported;

          exports[exportedName] = exportedType;
        });
      })
      .with({ type: "ECBlockStatement" }, (node) => {
        node.body.forEach((st) => typeCheckNode(st));
      })
      .with({ type: "ECForStatement" }, (node) => {
        if (node.init && node.init.type !== "ECVariableDeclaration") {
          typeCheckExp(node.init);
        }

        if (node.test) {
          const testType = typeCheckExp(node.test).ectype;

          if (testType.baseType !== "error" && !testType.eq(Bool)) {
            scope.error(
              "CONDITION_TYPE_MISMATCH",
              { structure: "for-loop", received: testType },
              node.test,
            );
          }
        }

        if (node.update) {
          typeCheckExp(node.update);
        }

        typeCheckNode(node.body);
      })
      .with({ type: "ECIfStatement" }, (node) => {
        const testType = typeCheckExp(node.test).ectype;
        if (testType.baseType !== "error" && !testType.eq(Bool)) {
          scope.error(
            "CONDITION_TYPE_MISMATCH",
            { structure: "if-statement", received: testType },
            node.test,
          );
        }

        typeCheckNode(node.consequent);

        if (node.alternate) {
          typeCheckNode(node.alternate);
        }
      })
      .with({ type: "ECLabeledStatement" }, (node) => {
        typeCheckNode(node.body);
      })
      .with({ type: "ECReturnStatement" }, (node) => {
        if (!node.argument) {
          scope.error("MISSING_EXPECTED", { syntax: "return value" }, node);
          return;
        }
        const returnedType = typeCheckExp(node.argument).ectype;

        if (scope.current.functionScope.kind === "inferred") {
          if (scope.current.functionScope.returns === null) {
            scope.current.functionScope.returns = returnedType;
          } else {
            if (
              scope.current.functionScope.returns.baseType !== "error" &&
              !scope.current.functionScope.returns.eq(returnedType)
            ) {
              scope.error(
                "INFERRED_RETURN_TYPE_MISMATCH",
                {
                  received: returnedType,
                  seen: scope.current.functionScope.returns,
                },
                node.argument,
              );
              scope.current.functionScope.returns = ErrorType;
            }
          }
        } else if (scope.current.functionScope.kind === "expected") {
          if (!scope.current.functionScope.returns.eq(returnedType)) {
            scope.error(
              "EXPECTED_RETURN_TYPE_MISMATCH",
              {
                received: returnedType,
                expected: scope.current.functionScope.returns,
              },
              node.argument,
            );
          }
        } else {
          scope.error(
            "FORBIDDEN",
            { behavior: "return outside of a function " },
            node,
          );
        }
      })
      .with({ type: "ECSwitchStatement" }, (node) => {
        typeCheckExp(node.discriminant);

        node.cases.forEach((c) => {
          if (c.test) {
            typeCheckExp(c.test);
          }

          c.consequent.forEach((n) => typeCheckNode(n));
        });
      })
      .with({ type: "ECTryStatement" }, (node) => {
        typeCheckNode(node.block);

        if (node.handler) {
          if (node.handler.param) {
            // TODO: this should probably use the same logic as destructuring on function parameters
            // typeCheckPattern(node.handler.param);
            throw new Error(`Not yet implemented`);
          }

          typeCheckNode(node.handler.body);
        }

        if (node.finalizer) {
          typeCheckNode(node.finalizer);
        }
      })
      .with({ type: "ECVariableDeclaration" }, (node) => {
        node.declarations.forEach((decl) => {
          if (!decl.init) {
            throw new Error(`Variable ${decl.id} must be initialized.`);
          }

          const ident: string = match(decl.id)
            .with({ type: "ECIdentifier" }, (id) => id.name)
            .otherwise(() => {
              throw new Error(
                `Declarations with ${decl.id.type} are not yet supported.`,
              );
            });

          const createdType = typeCheckExp(decl.init).ectype;

          if (createdType.baseType === "type" && node.kind !== "const") {
            throw new Error(`Type declarations must be const.`);
          }

          scope.current.set(ident, createdType);
        });
      })
      .with({ type: "ECWhileStatement" }, (node) => {
        const testType = typeCheckExp(node.test).ectype;
        if (testType.baseType !== "error" && !testType.eq(Bool)) {
          scope.error(
            "CONDITION_TYPE_MISMATCH",
            { structure: "while-loop", received: testType },
            node.test,
          );
        }

        typeCheckNode(node.body);
      })
      .otherwise((node) => typeCheckExp(node as ECExp));

  const typeCheckExp = bindTypeCheckExp({
    scope,
    typeCheckNode,
  });

  return typeCheckNode;
};
