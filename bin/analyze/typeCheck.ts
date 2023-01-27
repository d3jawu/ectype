import { Bool, TypeAnnotation } from "../types/TypeAnnotation";
import { Num } from "../types/TypeAnnotation";
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

let currentScope = new SymbolTable(null);

export const typeCheck = (body: KNode[]) =>
  body.forEach((node) => typeCheckNode(node));

const typeCheckNode = (node: KNode) =>
  match<KNode, void>(node)
    .with(
      { type: "BreakStatement" },
      { type: "ContinueStatement" },
      { type: "DebuggerStatement" },
      { type: "EmptyStatement" },
      { type: "ExportNamedDeclaration" },
      { type: "ImportDeclaration" },
      () => {}
    )
    .with({ type: "KBlockStatement" }, (node) => {
      node.statements.forEach((st) => typeCheckNode(st));
    })
    .with({ type: "KDoWhileStatement" }, (node) => {})
    .with({ type: "KForStatement" }, () => {})
    .with({ type: "KIfStatement" }, () => {})
    .with({ type: "KLabeledStatement" }, () => {})
    .with({ type: "KReturnStatement" }, () => {})
    .with({ type: "KSwitchStatement" }, () => {})
    .with({ type: "KTryStatement" }, () => {})
    .with({ type: "KVariableDeclaration" }, () => {})
    .with({ type: "KWhileStatement" }, () => {})
    .otherwise((node) => typeCheckExp(node as KExp));

const typeCheckExp = (node: KExp): TypeAnnotation =>
  match<KExp, TypeAnnotation>(node)
    // TODO is this right for BigInt?
    .with({ type: "BigIntLiteral" }, (node) => ({ ktype: "num" }))
    .with({ type: "BooleanLiteral" }, (node) => ({ ktype: "bool" }))
    .with({ type: "NullLiteral" }, (node) => ({ ktype: "null" }))
    .with({ type: "NumericLiteral" }, (node) => ({ ktype: "num" }))
    .with({ type: "StringLiteral" }, (node) => ({ ktype: "str" }))
    .with({ type: "Identifier" }, (node) => {
      const maybeType = currentScope.get(node.value);
      if (!maybeType) {
        throw new Error(`${node.value} is undeclared.`);
      }

      return maybeType;
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
      match<KBinaryOperator, TypeAnnotation>(node.operator)
        .with("===", "!==", "&&", "||", () => {
          const left = typeCheckExp(node.left);
          const right = typeCheckExp(node.right);

          if (!typeEq(left, Bool) || !typeEq(right, Bool)) {
            throw new Error(``);
          }

          return { ktype: "bool" };
        })
        .with("<", "<=", ">", ">=", () => {
          const left = typeCheckExp(node.left);
          const right = typeCheckExp(node.right);

          if (!typeEq(left, Num) || !typeEq(right, Num)) {
            throw new Error(``);
          }

          return { ktype: "bool" };
        })
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
          () => {
            const left = typeCheckExp(node.left);
            const right = typeCheckExp(node.right);

            if (!typeEq(left, Num) || !typeEq(right, Num)) {
              throw new Error(``);
            }

            return { ktype: "num" };
          }
        )
        .with("??", () => {
          throw new Error("`??` is forbidden in Kythera.");
        })
        .exhaustive()
    )
    .with({ type: "KCallExpression" }, (node) => {
      if (node.callee.type === "Identifier") {
        // Check to see if the callee was a keyword function.
      }

      // If not, it's a normal call expression.
    })
    .with({ type: "KConditionalExpression" }, (node) => {})
    .with({ type: "KMemberExpression" }, () => {})
    .with({ type: "KObjectExpression" }, () => {})
    .with({ type: "KSequenceExpression" }, () => {})
    .with({ type: "KTaggedTemplateExpression" }, () => {})
    .with({ type: "KTemplateLiteral" }, () => {})
    .with({ type: "KUnaryExpression" }, (node) =>
      match<KUnaryOperator, TypeAnnotation>(node.operator)
        .with("!", () => ({ ktype: "bool" }))
        .with("+", () => ({ ktype: "num" }))
        .with("-", () => ({ ktype: "num" }))
        .with("~", () => ({ ktype: "num" }))
        .exhaustive()
    )
    .exhaustive();

const typeEq = (a: TypeAnnotation, b: TypeAnnotation): boolean => {
  const ktype = a.ktype;

  if (ktype !== b.ktype) {
    return false;
  }

  if (ktype === "fn") {
    return typeEq(a.from, b.from);
  } else {
    return true;
  }
};
