import type { ModuleItem, Expression, ExpressionStatement } from "@swc/core";
import type { KytheraNode } from "../types/KytheraNode";

import { match } from "ts-pattern";

export const sanitize = (body: ModuleItem[]): KytheraNode =>
  body.map((node) => sanitizeNode(node));

const sanitizeNode = (node: ModuleItem): KytheraNode =>
  match<ModuleItem, KytheraNode>(node)
    .with({ type: "BlockStatement" }, () => {})
    .with({ type: "BreakStatement" }, () => {})
    .with({ type: "ClassDeclaration" }, () => {
      throw new Error("`class` declarations are forbidden in Kythera.");
    })
    .with({ type: "ContinueStatement" }, () => {})
    .with({ type: "DebuggerStatement" }, () => {})
    .with({ type: "DoWhileStatement" }, () => {})
    .with({ type: "EmptyStatement" }, () => {})
    .with({ type: "ExportAllDeclaration" }, () => {})
    .with({ type: "ExportDeclaration" }, () => {})
    .with({ type: "ExportDefaultDeclaration" }, () => {})
    .with({ type: "ExportDefaultExpression" }, () => {})
    .with({ type: "ExportNamedDeclaration" }, () => {})
    .with({ type: "ExpressionStatement" }, (val) => sanitizeExpression(val))
    .with({ type: "ForInStatement" }, () => {})
    .with({ type: "ForOfStatement" }, () => {})
    .with({ type: "ForStatement" }, () => {})
    .with({ type: "FunctionDeclaration" }, () => {})
    .with({ type: "IfStatement" }, () => {})
    .with({ type: "ImportDeclaration" }, () => {})
    .with({ type: "LabeledStatement" }, () => {})
    .with({ type: "ReturnStatement" }, () => {})
    .with({ type: "SwitchStatement" }, () => {})
    .with({ type: "ThrowStatement" }, () => {
      throw new Error("`throw` is forbidden in Kythera.");
    })
    .with({ type: "TryStatement" }, () => {})
    .with({ type: "VariableDeclaration" }, () => {})
    .with({ type: "WhileStatement" }, () => {})
    .with({ type: "WithStatement" }, () => {
      throw new Error("`with` is forbidden in Kythera.");
    })
    .otherwise(() => {
      throw new Error(`Invalid node: ${node.type}`);
    });

const sanitizeExpression = (node: ExpressionStatement): KytheraNode =>
  match<Expression, KytheraNode>(node.expression)
    .with({ type: "ArrayExpression" }, () => {})
    .with({ type: "ArrowFunctionExpression" }, () => {})
    .with({ type: "AssignmentExpression" }, () => {})
    .with({ type: "AwaitExpression" }, () => {})
    .with({ type: "BigIntLiteral" }, () => {})
    .with({ type: "BinaryExpression" }, () => {})
    .with({ type: "BooleanLiteral" }, () => {})
    .with({ type: "CallExpression" }, () => {})
    .with({ type: "ClassExpression" }, () => {})
    .with({ type: "ConditionalExpression" }, () => {})
    .with({ type: "FunctionExpression" }, () => {})
    .with({ type: "Identifier" }, () => {})
    .with({ type: "Invalid" }, () => {})
    .with({ type: "MemberExpression" }, () => {})
    .with({ type: "MetaProperty" }, () => {})
    .with({ type: "NewExpression" }, () => {
      throw new Error("`new` is forbidden in Kythera.");
    })
    .with({ type: "NullLiteral" }, () => {})
    .with({ type: "NumericLiteral" }, () => {})
    .with({ type: "ObjectExpression" }, () => {})
    .with({ type: "OptionalChainingExpression" }, () => {})
    .with({ type: "ParenthesisExpression" }, () => {})
    .with({ type: "PrivateName" }, () => {})
    .with({ type: "RegExpLiteral" }, () => {})
    .with({ type: "SequenceExpression" }, () => {})
    .with({ type: "StringLiteral" }, () => {})
    .with({ type: "SuperPropExpression" }, () => {})
    .with({ type: "TaggedTemplateExpression" }, () => {})
    .with({ type: "TemplateLiteral" }, () => {})
    .with({ type: "ThisExpression" }, () => {
      throw new Error("`this` is forbidden in Kythera.");
    })
    .with({ type: "UnaryExpression" }, () => {})
    .with({ type: "UpdateExpression" }, () => {})
    .with({ type: "YieldExpression" }, () => {})
    .otherwise(() => {
      throw new Error(`Invalid expression node: ${node.expression.type}`);
    });
