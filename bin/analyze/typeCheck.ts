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
import { KPattern } from "../types/KPattern";

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
    .with({ type: "KDoWhileStatement" }, (node) => {
      const testType = typeCheckExp(node.test);
      if (!typeEq(testType, Bool)) {
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

        if (!typeEq(testType, Bool)) {
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
      if (!typeEq(testType, Bool)) {
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
      if (!typeEq(testType, Bool)) {
        throw new Error(`Condition for while-statement must be a Bool.`);
      }

      typeCheckNode(node.body);
    })
    .otherwise((node) => typeCheckExp(node as KExp));

const typeCheckPattern = (pattern: KPattern) => {};

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

      // Otherwise, it's a normal call expression.
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
  if (a.ktype !== b.ktype) {
    return false;
  }

  // Would love to know if there's a more elegant way to write these type guards.

  if (a.ktype === "fn" && b.ktype === "fn") {
    return typeEq(a.from, b.from) && typeEq(a.to, b.to);
  }

  if (a.ktype === "variant" && b.ktype === "variant") {
    const aOptions = Object.entries(a.options);
    const bOptions = Object.entries(b.options);

    return (
      aOptions.length === bOptions.length &&
      aOptions.every(
        ([aKey, aVal]) => b.options[aKey] && typeEq(aVal, b.options[aKey])
      )
    );
  }

  if (a.ktype === "tuple" && b.ktype === "tuple") {
    return (
      a.fields.length === b.fields.length &&
      a.fields.every((val, i) => typeEq(val, b.fields[i]))
    );
  }

  if (a.ktype === "array" && b.ktype === "array") {
    return typeEq(a.contains, b.contains);
  }

  if (a.ktype === "variant" && b.ktype === "variant") {
    const aOptions = Object.entries(a.options);
    const bOptions = Object.entries(b.options);

    return (
      aOptions.length === bOptions.length &&
      aOptions.every(
        ([aKey, aVal]) => b.options[aKey] && typeEq(aVal, b.options[aKey])
      )
    );
  }

  return true;
};
