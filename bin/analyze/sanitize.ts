import type { ModuleItem, Expression, ExpressionStatement } from "@swc/core";
import type { KytheraNode } from "../types/KytheraNode";

import { match } from "ts-pattern";

export const sanitize = (body: ModuleItem[]): KytheraNode[] =>
  body.map((node) => sanitizeNode(node));

const sanitizeNode = (node: ModuleItem): KytheraNode =>
  match<ModuleItem, KytheraNode>(node)
    // passthroughs
    .with({ type: "DebuggerStatement" }, (node) => node)
    .with({ type: "EmptyStatement" }, (node) => node)

    .with({ type: "BlockStatement" }, () => {})
    .with({ type: "BreakStatement" }, () => {})
    .with({ type: "ClassDeclaration" }, () => {
      throw new Error("`class` declarations are forbidden in Kythera.");
    })
    .with({ type: "ContinueStatement" }, () => {})
    .with({ type: "DoWhileStatement" }, () => {})

    .with({ type: "ExportAllDeclaration" }, () => {})
    .with({ type: "ExportDeclaration" }, () => {})
    .with({ type: "ExportDefaultExpression" }, () => {})
    .with({ type: "ExportNamedDeclaration" }, () => {})

    .with({ type: "ExpressionStatement" }, (val) => sanitizeExpression(val))

    .with({ type: "ForStatement" }, () => {})
    .with({ type: "IfStatement" }, () => {})
    .with({ type: "ImportDeclaration" }, () => {})
    .with({ type: "LabeledStatement" }, () => {})
    .with({ type: "ReturnStatement" }, () => {})
    .with({ type: "SwitchStatement" }, () => {})

    .with({ type: "TryStatement" }, () => {})
    .with({ type: "VariableDeclaration" }, (node) => {
      if (node.kind === "var") {
        throw new Error(
          "`var` is forbidden in Kythera. Use `const` or `let` instead."
        );
      }

      throw new Error("TODO");
    })
    .with({ type: "WhileStatement" }, () => {})
    // forbidden statements
    .with({ type: "ExportDefaultDeclaration" }, () => {
      throw new Error(
        "`export default` is forbidden in Kythera. Use a non-default `export` instead."
      );
    })
    .with({ type: "ForInStatement" }, () => {
      throw new Error("`for in` is forbidden in Kythera.");
    })
    .with({ type: "ForOfStatement" }, () => {
      throw new Error("`for of` is forbidden in Kythera.");
    })
    .with({ type: "FunctionDeclaration" }, () => {
      throw new Error(
        "`function` declarations are forbidden in Kythera. Use an arrow function () => {} instead."
      );
    })
    .with({ type: "ThrowStatement" }, () => {
      throw new Error("`throw` is forbidden in Kythera.");
    })
    .with({ type: "WithStatement" }, () => {
      throw new Error("`with` is forbidden in Kythera.");
    })
    .otherwise(() => {
      throw new Error(`Invalid node: ${node.type}`);
    });

const sanitizeExpression = (node: ExpressionStatement): KytheraNode =>
  match<Expression, KytheraNode>(node.expression)
    // literals
    .with({ type: "NullLiteral" }, (exp) => exp)
    .with({ type: "BooleanLiteral" }, (exp) => exp)
    .with({ type: "BigIntLiteral" }, (exp) => exp)
    .with({ type: "StringLiteral" }, (exp) => exp)
    .with({ type: "TemplateLiteral" }, (exp) => exp)
    .with({ type: "RegExpLiteral" }, () => {
      throw new Error("Regexes are not yet implemented.");
    })

    .with({ type: "ArrayExpression" }, () => {})

    .with({ type: "ArrowFunctionExpression" }, () => {})

    .with({ type: "AssignmentExpression" }, () => {})

    .with({ type: "AwaitExpression" }, () => {})

    .with({ type: "BinaryExpression" }, () => {})

    .with({ type: "CallExpression" }, () => {})

    .with({ type: "ConditionalExpression" }, () => {})
    .with({ type: "Identifier" }, () => {})
    .with({ type: "Invalid" }, () => {})
    .with({ type: "MemberExpression" }, () => {})
    .with({ type: "MetaProperty" }, () => {})

    .with({ type: "NumericLiteral" }, (exp) => exp)
    .with({ type: "ObjectExpression" }, () => {})
    .with({ type: "ParenthesisExpression" }, () => {})
    .with({ type: "PrivateName" }, () => {})
    .with({ type: "SequenceExpression" }, () => {})
    .with({ type: "SuperPropExpression" }, () => {})
    .with({ type: "TaggedTemplateExpression" }, () => {})

    .with({ type: "UnaryExpression" }, () => {})
    .with({ type: "UpdateExpression" }, () => {})
    .with({ type: "YieldExpression" }, () => {})
    // forbidden expressions
    .with({ type: "ClassExpression" }, () => {
      throw new Error("`class` expressions are forbidden in Kythera.");
    })
    .with({ type: "FunctionExpression" }, () => {
      throw new Error(
        "`function` expressions are forbidden in Kythera. Use an arrow function () => {} instead."
      );
    })
    .with({ type: "NewExpression" }, () => {
      throw new Error("`new` is forbidden in Kythera.");
    })
    .with({ type: "OptionalChainingExpression" }, () => {
      "Optional chain `?.` expressions are forbidden in Kythera.";
    })
    .with({ type: "ThisExpression" }, () => {
      throw new Error("`this` is forbidden in Kythera.");
    })
    .otherwise(() => {
      throw new Error(`Invalid expression node: ${node.expression.type}`);
    });
