import { AnnotatedNode } from "../types/AnnotatedNode";
import { KExp, KNode } from "../types/KytheraNode";

import { match } from "ts-pattern";

export const annotate = (body: KNode[]): AnnotatedNode[] =>
  body.map((node) => annotateNode(node));

let k: KNode;

const annotateNode = (node: KNode): AnnotatedNode =>
  match<KNode, AnnotatedNode>(node)
    // TODO is this right for BigInt?
    .with({ type: "BigIntLiteral" }, (node) => ({
      ...node,
      atype: { ktype: "num" },
    }))
    .with({ type: "BooleanLiteral" }, (node) => ({
      ...node,
      atype: { ktype: "bool" },
    }))
    .with({ type: "NullLiteral" }, (node) => ({
      ...node,
      atype: { ktype: "null" },
    }))
    .with({ type: "NumericLiteral" }, (node) => ({
      ...node,
      atype: { ktype: "num" },
    }))
    .with({ type: "StringLiteral" }, (node) => ({
      ...node,
      atype: { ktype: "str" },
    }))
    .with({ type: "Identifier" }, () => {})
    .with({ type: "KArrayExpression" }, () => {})
    .with({ type: "KArrowFunctionExpression" }, () => {})
    .with({ type: "KAssignmentExpression" }, () => {})
    .with({ type: "KAwaitExpression" }, () => {})
    .with({ type: "KBinaryExpression" }, () => {})
    .with({ type: "KCallExpression" }, () => {})
    .with({ type: "KConditionalExpression" }, () => {})
    .with({ type: "KMemberExpression" }, () => {})
    .with({ type: "KObjectExpression" }, () => {})
    .with({ type: "KSequenceExpression" }, () => {})
    .with({ type: "KTaggedTemplateExpression" }, () => {})
    .with({ type: "KTemplateLiteral" }, () => {})
    .with({ type: "KUnaryExpression" }, () => {})
    .when(
      (node) =>
        [
          "BreakStatement",
          "ContinueStatement",
          "DebuggerStatement",
          "EmptyStatement",
          "ExportNamedDeclaration",
          "ImportDeclaration",
          "KBlockStatement",
          "KDoWhileStatement",
          "KForStatement",
          "KIfStatement",
          "KLabeledStatement",
          "KReturnStatement",
          "KSwitchStatement",
          "KTryStatement",
          "KVariableDeclaration",
          "KWhileStatement",
        ].includes(node.type),
      (node) => ({ ...node, atype: { ktype: "statement" } })
    )
    .otherwise((node) => {
      throw new Error(`Unexpected node: ${node.type}`);
    });
