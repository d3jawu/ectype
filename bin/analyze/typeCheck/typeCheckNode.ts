import { ECExp, ECNode } from "../../types/ECNode.js";

import { analyzeFile } from "../analyzeFile.js";

import { match } from "ts-pattern";

import { dirname, join as joinPaths } from "path";

import { SymbolTable } from "../SymbolTable.js";

import { bindTypeCheckExp } from "./typeCheckExp.js";

import { Bool } from "../../../core/primitives.js";
import { Type } from "../../../core/types.js";

export const bindTypeCheckNode = ({
  path,
  scope,
  exports,
}: {
  path: string;
  scope: { current: SymbolTable };
  exports: Record<string, Type>;
}) => {
  const typeCheckNode = (node: ECNode) =>
    match<ECNode, void>(node)
      .with(
        { type: "BreakStatement" },
        { type: "ContinueStatement" },
        { type: "DebuggerStatement" },
        { type: "EmptyStatement" },
        () => {}
      )
      .with({ type: "ImportDeclaration" }, (node) => {
        // TODO handle modules in addition to raw paths
        const importedTypes = analyzeFile(
          joinPaths(dirname(path), node.source.value)
        );

        if (importedTypes === null) {
          // File was not an Ectype file; do nothing.
          return;
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type === "ImportDefaultSpecifier") {
            throw new Error(`Default imports are not yet implemented.`);
          }

          if (specifier.type === "ImportNamespaceSpecifier") {
            throw new Error(`Namespace imports are not yet implemented.`);
          }

          const remoteName = specifier.imported
            ? specifier.imported.value
            : specifier.local.value;
          const localName = specifier.local.value;

          if (!importedTypes[remoteName]) {
            throw new Error(
              `${remoteName} is not exported by ${node.source.value}.`
            );
          }

          scope.current.set(localName, importedTypes[remoteName]);
        });
      })
      .with({ type: "ExportNamedDeclaration" }, (node) => {
        if (node.source !== null) {
          throw new Error(`Re-exports are not yet supported.`);
        }

        node.specifiers.forEach((specifier) => {
          if (specifier.type === "ExportDefaultSpecifier") {
            throw new Error(`Default exports are forbidden in Ectype.`);
          }

          if (specifier.type === "ExportNamespaceSpecifier") {
            throw new Error(`Namespace exports are not yet implemented.`);
          }

          const exportedType = scope.current.get(specifier.orig.value);
          if (exportedType === null) {
            throw new Error(
              `Could not export ${specifier.orig.value} because it is not defined.`
            );
          }

          const exportedName = specifier.exported
            ? specifier.exported.value
            : specifier.orig.value;

          exports[exportedName] = exportedType;
        });
      })
      .with({ type: "ECBlockStatement" }, (node) => {
        node.statements.forEach((st) => typeCheckNode(st));
      })
      .with({ type: "ECForStatement" }, (node) => {
        if (node.init && node.init.type !== "ECVariableDeclaration") {
          typeCheckExp(node.init);
        }

        if (node.test) {
          const testType = typeCheckExp(node.test).ectype;

          if (!testType.sub(Bool)) {
            throw new Error(`Condition for for-loop must be a Bool.`);
          }
        }

        if (node.update) {
          typeCheckExp(node.update);
        }

        typeCheckNode(node.body);
      })
      .with({ type: "ECIfStatement" }, (node) => {
        const testType = typeCheckExp(node.test).ectype;
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for if-statement must be a Bool.`);
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
          throw new Error(`A value must be returned.`);
        }
        const returnedType = typeCheckExp(node.argument).ectype;

        if (!!scope.current.returnType) {
          if (!returnedType.sub(scope.current.returnType)) {
            throw new Error(
              `Expected return type of ${scope.current.returnType} but got ${returnedType}`
            );
          }
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
            .with({ type: "Identifier" }, (id) => id.value)
            .otherwise(() => {
              throw new Error(
                `Declarations with ${decl.id.type} are not yet supported.`
              );
            });

          scope.current.set(ident, typeCheckExp(decl.init).ectype);
        });
      })
      .with({ type: "ECWhileStatement" }, (node) => {
        const testType = typeCheckExp(node.test).ectype;
        if (!testType.sub(Bool)) {
          throw new Error(`Condition for while-statement must be a Bool.`);
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
