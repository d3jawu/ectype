import type { TypeAnnotation } from "../types/TypeAnnotation";
import type {
  KBinaryOperator,
  KExp,
  KNode,
  KStatement,
  KUnaryOperator,
} from "../types/KytheraNode";

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

export const annotate = (body: KNode[]): KNode[] =>
  body.map((node) => annotateNode(node));

let currentScope = new SymbolTable(null);

const annotateNode = (node: KNode): KNode =>
  match<KNode, KNode>(node)
    .with(
      { type: "BreakStatement" },
      { type: "ContinueStatement" },
      { type: "DebuggerStatement" },
      { type: "EmptyStatement" },
      { type: "ExportNamedDeclaration" },
      { type: "ImportDeclaration" },
      (node) => ({ ...node, atype: { ktype: "statement" } })
    )
    .with({ type: "KBlockStatement" }, () => {})
    .with({ type: "KDoWhileStatement" }, () => {})
    .with({ type: "KForStatement" }, () => {})
    .with({ type: "KIfStatement" }, () => {})
    .with({ type: "KLabeledStatement" }, () => {})
    .with({ type: "KReturnStatement" }, () => {})
    .with({ type: "KSwitchStatement" }, () => {})
    .with({ type: "KTryStatement" }, () => {})
    .with({ type: "KVariableDeclaration" }, () => {})
    .with({ type: "KWhileStatement" }, () => {})
    .otherwise((node) => annotateExp(node as KExp));

const annotateExp = (node: KExp): KExp =>
  match<KExp, KExp>(node)
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
    .with({ type: "KArrayExpression" }, () => {
      throw new Error(
        `Bare array expressions are forbidden; they must be attached to an array type.`
      );
    })
    .with({ type: "KArrowFunctionExpression" }, () => {
      throw new Error(
        `Bare function expressions are forbidden; they must be attached to a function type.`
      );
    })
    .with({ type: "KAssignmentExpression" }, (node) => {})
    .with({ type: "KAwaitExpression" }, () => {
      throw new Error(`await is not yet implemented.`);
    })
    .with({ type: "KBinaryExpression" }, (node) =>
      match<KBinaryOperator, KExp>(node.operator)
        .with("===", "!==", "&&", "||", "<", "<=", ">", ">=", () => ({
          ...node,
          left: annotateExp(node.left),
          right: annotateExp(node.right),
          atype: { ktype: "bool" },
        }))
        .with(
          "+",
          "-",
          "*",
          "/",
          "%",
          "**",
          "|",
          "&",
          "^",
          "<<",
          ">>",
          ">>>",
          () => ({
            ...node,
            atype: { ktype: "num" },
          })
        )
        .with("??", () => {
          throw new Error("`??` is forbidden in Kythera.");
        })
        .exhaustive()
    )
    .with({ type: "KCallExpression" }, () => {
      // This is the big one. Calls to type constructors are handled here too.
      // Type constructors are only ever called directly.
    })
    .with({ type: "KConditionalExpression" }, () => {})
    .with({ type: "KMemberExpression" }, () => {})
    .with({ type: "KObjectExpression" }, () => {})
    .with({ type: "KSequenceExpression" }, () => {})
    .with({ type: "KTaggedTemplateExpression" }, () => {})
    .with({ type: "KTemplateLiteral" }, () => {})
    .with({ type: "KUnaryExpression" }, (node) =>
      match<KUnaryOperator, KExp>(node.operator)
        .with("!", () => ({
          ...node,
          atype: { ktype: "bool" },
        }))
        .with("+", () => ({
          ...node,
          atype: { ktype: "num" },
        }))
        .with("-", () => ({
          ...node,
          atype: { ktype: "num" },
        }))
        .with("~", () => ({
          ...node,
          atype: { ktype: "num" },
        }))
        .exhaustive()
    )
    .exhaustive();
