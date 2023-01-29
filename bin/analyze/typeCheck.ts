import type {
  KBinaryOperator,
  KExp,
  KNode,
  KStatement,
  KUnaryOperator,
} from "../types/KytheraNode";

import { Type } from "../../core/types.js";
import { Null, Num, Bool, Str } from "../../core/primitives.js";

import { match } from "ts-pattern";
import { KPattern } from "../types/KPattern";

class SymbolTable {
  parent: SymbolTable | null;
  values: Record<string, Type>;

  constructor(parent: SymbolTable | null) {
    this.parent = parent;
    this.values = {};
  }

  get(name: string): Type | null {
    if (name in this.values) {
      return this.values[name];
    } else if (this.parent !== null) {
      return this.parent.get(name);
    } else {
      return null;
    }
  }

  set(name: string, type: Type) {
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
    .with({ type: "KDoWhileStatement" }, (node) => {
      const testType = typeCheckExp(node.test);
      if (!testType.sub(Bool)) {
        throw new Error(`Condition for do-while must be a Bool.`);
      }

      typeCheckNode(node.body);
    })
    .with({ type: "KForStatement" }, (node) => {
      if (node.init && node.init.type !== "KVariableDeclaration") {
        typeCheckExp(node.init);
      }

      if (node.test) {
        const testType = typeCheckExp(node.test);

        if (!testType.sub(Bool)) {
          throw new Error(`Condition for for-loop must be a Bool.`);
        }
      }

      if (node.update) {
        typeCheckExp(node.update);
      }

      typeCheckNode(node.body);
    })
    .with({ type: "KIfStatement" }, (node) => {
      const testType = typeCheckExp(node.test);
      if (!testType.sub(Bool)) {
        throw new Error(`Condition for if-statement must be a Bool.`);
      }

      typeCheckNode(node.consequent);

      if (node.alternate) {
        typeCheckNode(node.alternate);
      }
    })
    .with({ type: "KLabeledStatement" }, (node) => {
      typeCheckNode(node.body);
    })
    .with({ type: "KReturnStatement" }, (node) => {
      if (node.argument) {
        typeCheckExp(node.argument);
      }
    })
    .with({ type: "KSwitchStatement" }, (node) => {
      typeCheckExp(node.discriminant);

      node.cases.forEach((c) => {
        if (c.test) {
          typeCheckExp(c.test);
        }

        c.consequent.forEach((n) => typeCheckNode(n));
      });
    })
    .with({ type: "KTryStatement" }, (node) => {
      typeCheckNode(node.block);

      if (node.handler) {
        if (node.handler.param) {
          typeCheckPattern(node.handler.param);
        }

        typeCheckNode(node.handler.body);
      }

      if (node.finalizer) {
        typeCheckNode(node.finalizer);
      }
    })
    .with({ type: "KVariableDeclaration" }, () => {})
    .with({ type: "KWhileStatement" }, (node) => {
      const testType = typeCheckExp(node.test);
      if (!testType.sub(Bool)) {
        throw new Error(`Condition for while-statement must be a Bool.`);
      }

      typeCheckNode(node.body);
    })
    .otherwise((node) => typeCheckExp(node as KExp));

const typeCheckPattern = (pattern: KPattern) => {};

const typeCheckExp = (node: KExp): Type =>
  match<KExp, Type>(node)
    // TODO is this right for BigInt?
    .with({ type: "BigIntLiteral" }, (node) => Num)
    .with({ type: "BooleanLiteral" }, (node) => Bool)
    .with({ type: "NullLiteral" }, (node) => Null)
    .with({ type: "NumericLiteral" }, (node) => Num)
    .with({ type: "StringLiteral" }, (node) => Str)
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
      match<KBinaryOperator, Type>(node.operator)
        .with("===", "!==", "&&", "||", () => {
          const left = typeCheckExp(node.left);
          const right = typeCheckExp(node.right);

          if (!left.sub(Bool) || !right.sub(Bool)) {
            throw new Error(`${node.operator} requires a Bool on both sides.`);
          }

          return Bool;
        })
        .with("<", "<=", ">", ">=", () => {
          const left = typeCheckExp(node.left);
          const right = typeCheckExp(node.right);

          if (!left.sub(Num) || !right.sub(Num)) {
            throw new Error(`${node.operator} requires a Num on both sides.`);
          }

          return Bool;
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

            if (!left.sub(Num) || !right.sub(Num)) {
              throw new Error(`${node.operator} requires a Num on both sides.`);
            }

            return Num;
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

      // Otherwise, it's a normal call expression.
    })
    .with({ type: "KConditionalExpression" }, (node) => {})
    .with({ type: "KMemberExpression" }, () => {})
    .with({ type: "KObjectExpression" }, () => {})
    .with({ type: "KSequenceExpression" }, () => {})
    .with({ type: "KTaggedTemplateExpression" }, () => {})
    .with({ type: "KTemplateLiteral" }, () => {})
    .with({ type: "KUnaryExpression" }, (node) =>
      match<KUnaryOperator, Type>(node.operator)
        .with("!", () => Bool)
        .with("+", () => Num)
        .with("-", () => Num)
        .with("~", () => Num)
        .exhaustive()
    )
    .exhaustive();
