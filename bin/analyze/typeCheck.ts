import type {
  KBinaryOperator,
  KExp,
  KNode,
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
    .with({ type: "KVariableDeclaration" }, (node) => {
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

        currentScope.set(ident, typeCheckExp(decl.init));
      });
    })
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
    // TODO BigInt needs its own type.
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
    .with({ type: "KAssignmentExpression" }, (node) => {
      const leftType: Type = match(node.left)
        .with(
          { type: "Identifier" },
          (node) =>
            currentScope.get(node.value) ||
            (() => {
              throw new Error(
                `Attempted to assign to undefined variable ${node.value}`
              );
            })()
        )
        .otherwise(() => {
          throw new Error(
            `Assignments to ${node.left.type} are not yet supported.`
          );
        });

      const rightType = typeCheckExp(node.right);

      if (!rightType.sub(leftType)) {
        throw new Error(
          `Expected type compatible with ${leftType} but got ${rightType}`
        );
      }

      return rightType;
    })
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
    .with({ type: "KConditionalExpression" }, (node) => {
      const testType = typeCheckExp(node.test);
      if (!testType.sub(Bool)) {
        throw new Error(`Condition for ternary expression must be a Bool.`);
      }

      const consequentType = typeCheckExp(node.consequent);
      const alternateType = typeCheckExp(node.alternate);

      if (
        !consequentType.sub(alternateType) ||
        !alternateType.sub(consequentType)
      ) {
        throw new Error(`Types for ternary expression results must match.`);
      }

      return alternateType;
    })
    .with({ type: "KMemberExpression" }, () => {})
    .with({ type: "KObjectExpression" }, () => {})
    .with({ type: "KSequenceExpression" }, (node) => {
      node.expressions.forEach((exp) => typeCheckExp(exp));

      return typeCheckExp(node.expressions[node.expressions.length - 1]);
    })
    .with({ type: "KTaggedTemplateExpression" }, () => {
      throw new Error(`Tagged tempaltes are not yet implemented.`);
    })
    .with({ type: "KTemplateLiteral" }, (node) => {
      node.expressions.forEach((exp) => typeCheckExp(exp));

      return Str;
    })
    .with({ type: "KUnaryExpression" }, (node) =>
      match<KUnaryOperator, Type>(node.operator)
        .with("!", () => Bool)
        .with("+", () => Num)
        .with("-", () => Num)
        .with("~", () => Num)
        .exhaustive()
    )
    .exhaustive();
