import type { AnnotatedNode } from "../types/AnnotatedNode";
import type { TypeAnnotation } from "../types/TypeAnnotation";
import type { KNode } from "../types/KytheraNode";

import { match } from "ts-pattern";

class SymbolTable {
  parent: SymbolTable | null;
  values: Record<string, TypeAnnotation>;

  constructor(parent: SymbolTable | null) {
    this.parent = parent;
    this.values = {};
  }

  get(name: string): TypeAnnotation | null {
    if (name in this.values) {
      return this.values[name];
    } else if (this.parent !== null) {
      return this.parent.get(name);
    } else {
      return null;
    }
  }

  set(name: string, type: TypeAnnotation) {
    if (name in this.values) {
      throw new Error(`${name} is already defined in this immediate scope.`);
    }

    this.values[name] = type;
  }
}

export const annotate = (body: KNode[]): AnnotatedNode[] =>
  body.map((node) => annotateNode(node));

let currentScope = new SymbolTable(null);

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
    .with({ type: "Identifier" }, (node) => {
      const maybeType = currentScope.get(node.value);
      if (!maybeType) {
        throw new Error(`${node.value} is undeclared.`);
      }

      return { ...node, atype: maybeType };
    })
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
