import type { ModuleItem, Expression, Pattern } from "@swc/core";
import type {
  KBlockStatement,
  KExp,
  KNode,
  KVariableDeclaration,
} from "../types/KytheraNode";

import { match } from "ts-pattern";
import { KPattern } from "../types/KPattern";

export const sanitize = (body: ModuleItem[]): KNode[] =>
  body.map((node) => sanitizeNode(node));

const sanitizeNode = (node: ModuleItem): KNode =>
  match<ModuleItem, KNode>(node)
    // direct passthroughs
    .with({ type: "DebuggerStatement" }, (node) => node)
    .with({ type: "EmptyStatement" }, (node) => node)
    .with({ type: "BreakStatement" }, (node) => node)
    .with({ type: "ContinueStatement" }, (node) => node)

    // statements with rewrites onto Kythera nodes
    .with({ type: "BlockStatement" }, (node) => ({
      span: node.span,
      type: "KBlockStatement",
      statements: node.stmts.map((st) => sanitizeNode(st)),
    }))
    .with({ type: "DoWhileStatement" }, (node) => ({
      span: node.span,
      type: "KDoWhileStatement",
      test: sanitizeExpression(node.test),
      body: sanitizeNode(node.body),
    }))
    .with({ type: "WhileStatement" }, (node) => ({
      span: node.span,
      type: "KWhileStatement",
      test: sanitizeExpression(node.test),
      body: sanitizeNode(node.body),
    }))
    .with({ type: "ForStatement" }, (node) => ({
      span: node.span,
      type: "KForStatement",
      init:
        node.init &&
        (node.init.type === "VariableDeclaration"
          ? (sanitizeNode(node.init) as KVariableDeclaration)
          : sanitizeExpression(node.init)),
      test: node.test && sanitizeExpression(node.test),
      update: node.update && sanitizeExpression(node.update),
      body: sanitizeNode(node.body),
    }))
    .with({ type: "IfStatement" }, (node) => ({
      span: node.span,
      type: "KIfStatement",
      test: sanitizeExpression(node.test),
      consequent: sanitizeNode(node.consequent),
      alternate: node.alternate && sanitizeNode(node.alternate),
    }))
    .with({ type: "ReturnStatement" }, (node) => ({
      span: node.span,
      type: "KReturnStatement",
      argument: node.argument && sanitizeExpression(node.argument),
    }))
    .with({ type: "LabeledStatement" }, (node) => ({
      span: node.span,
      type: "KLabeledStatement",
      label: node.label,
      body: sanitizeNode(node.body),
    }))
    .with({ type: "SwitchStatement" }, (node) => ({
      span: node.span,
      type: "KSwitchStatement",
      discriminant: sanitizeExpression(node.discriminant),
      cases: node.cases.map((c) => ({
        type: "KSwitchCase",
        span: c.span,
        test: c.test && sanitizeExpression(c.test),
        consequent: c.consequent.map((n) => sanitizeNode(n)),
      })),
    }))
    .with({ type: "TryStatement" }, (node) => ({
      span: node.span,
      type: "KTryStatement",
      block: sanitizeNode(node.block) as KBlockStatement,
      handler: node.handler && {
        span: node.handler.span,
        type: "KCatchClause",
        param: node.handler.param && sanitizePattern(node.handler.param),
        body: sanitizeNode(node.handler.body) as KBlockStatement,
      },
      finalizer:
        node.finalizer && (sanitizeNode(node.finalizer) as KBlockStatement),
    }))
    .with({ type: "VariableDeclaration" }, (node) => {
      if (node.kind === "var") {
        throw new Error(
          "`var` is forbidden in Kythera. Use `const` or `let` instead."
        );
      }

      return {
        span: node.span,
        type: "KVariableDeclaration",
        kind: node.kind,
        declare: node.declare,
        declarations: node.declarations.map((decl) => ({
          span: decl.span,
          type: "KVariableDeclarator",
          id: sanitizePattern(decl.id),
          init: decl.init && sanitizeExpression(decl.init),
          definite: decl.definite,
        })),
      };
    })

    // import and export
    .with({ type: "ExportDeclaration" }, (node) => {
      throw new Error("Export declaration TBD");
    })
    // TODO: check against naming an export "default"?
    .with({ type: "ExportNamedDeclaration" }, (node) => node)
    // TODO: check for default imports
    .with({ type: "ImportDeclaration" }, (node) => node)

    // unpack expression
    .with({ type: "ExpressionStatement" }, (val) =>
      sanitizeExpression(val.expression)
    )

    // forbidden statements
    .with({ type: "ExportAllDeclaration" }, () => {
      throw new Error("Export-all declarations are forbidden in Kythera.");
    })
    .with({ type: "ExportDefaultExpression" }, () => {
      throw new Error("Default exports are forbidden in Kythera.");
    })
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
    .with({ type: "ClassDeclaration" }, () => {
      throw new Error("`class` declarations are forbidden in Kythera.");
    })
    .otherwise(() => {
      throw new Error(`Invalid node: ${node.type}`);
    });

const sanitizeExpression = (exp: Expression): KExp =>
  match<Expression, KExp>(exp)
    // literals
    .with({ type: "NullLiteral" }, (exp) => exp)
    .with({ type: "BooleanLiteral" }, (exp) => exp)
    .with({ type: "NumericLiteral" }, (exp) => exp)
    .with({ type: "BigIntLiteral" }, (exp) => exp)
    .with({ type: "StringLiteral" }, (exp) => exp)
    .with({ type: "TemplateLiteral" }, (exp) => exp)
    .with({ type: "RegExpLiteral" }, () => {
      throw new Error("Regexes are not yet implemented.");
    })
    .with({ type: "ArrayExpression" }, () => {})
    .with({ type: "ArrowFunctionExpression" }, (exp) => {})
    .with({ type: "AssignmentExpression" }, () => {})
    .with({ type: "AwaitExpression" }, (exp) => ({
      span: exp.span,
      type: "KAwaitExpression",
      argument: sanitizeExpression(exp.argument),
    }))
    .with({ type: "BinaryExpression" }, (exp) => {
      if (
        exp.operator === "==" ||
        exp.operator === "!=" ||
        exp.operator === "in" ||
        exp.operator === "instanceof"
      ) {
        throw new Error(`\`${exp.operator}\` is forbidden in Kythera.`);
      }

      return {
        span: exp.span,
        type: "KBinaryExpression",
        operator: exp.operator,
        left: sanitizeExpression(exp.left),
        right: sanitizeExpression(exp.right),
      };
    })
    .with({ type: "CallExpression" }, () => {})
    .with({ type: "ConditionalExpression" }, () => {})
    .with({ type: "Identifier" }, (exp) => exp)
    .with({ type: "MemberExpression" }, (exp) => {
      // Computed properties are valid for arrays but not structs, so
      // they are weeded out later when type-checking information is availble.

      if (exp.property.type === "PrivateName") {
        throw new Error("Private names are forbidden in Kythera.");
      }

      // TODO: check if member expression is a keyword function, e.g. Type.sub

      return {
        span: exp.span,
        type: "KMemberExpression",
        object: sanitizeExpression(exp.object),
        property:
          exp.property.type === "Identifier"
            ? exp.property
            : {
                span: exp.property.span,
                type: "KComputed",
                expression: sanitizeExpression(exp.property.expression),
              },
      };
    })
    .with({ type: "ObjectExpression" }, () => {})
    .with({ type: "ParenthesisExpression" }, (exp) =>
      sanitizeExpression(exp.expression)
    )
    .with({ type: "SequenceExpression" }, () => {})
    .with({ type: "TaggedTemplateExpression" }, () => {})
    .with({ type: "UnaryExpression" }, (exp) => {
      if (
        exp.operator === "typeof" ||
        exp.operator === "void" ||
        exp.operator === "delete"
      ) {
        throw new Error(`${exp.operator} is forbidden in Kythera.`);
      }

      return {
        span: exp.span,
        type: "KUnaryExpression",
        operator: exp.operator,
        argument: sanitizeExpression(exp.argument),
      };
    })

    // forbidden expressions
    .with({ type: "ClassExpression" }, () => {
      throw new Error("`class` expressions are forbidden in Kythera.");
    })
    .with({ type: "FunctionExpression" }, () => {
      throw new Error(
        "`function` expressions are forbidden in Kythera. Use an arrow function () => {} instead."
      );
    })
    .with({ type: "MetaProperty" }, () => {
      throw new Error("No meta-properties are supported in Kythera.");
    })
    .with({ type: "NewExpression" }, () => {
      throw new Error("`new` is forbidden in Kythera.");
    })
    .with({ type: "OptionalChainingExpression" }, () => {
      throw new Error(
        "Optional chain `?.` expressions are forbidden in Kythera."
      );
    })
    .with({ type: "PrivateName" }, () => {
      throw new Error("Private names are not currently supported in Kythera.");
    })
    .with({ type: "SuperPropExpression" }, () => {
      throw new Error("Super props are forbidden in Kythera.");
    })
    .with({ type: "ThisExpression" }, () => {
      throw new Error("`this` is forbidden in Kythera.");
    })
    .with({ type: "UpdateExpression" }, () => {
      throw new Error("++ and -- are forbidden in Kythera.");
    })
    .with({ type: "YieldExpression" }, () => {
      throw new Error("Yield expressions are forbidden in Kythera.");
    })
    .otherwise(() => {
      throw new Error(`Invalid expression node: ${exp.type}`);
    });

const sanitizePattern = (pattern: Pattern): KPattern =>
  match<Pattern, KPattern>(pattern)
    .with({ type: "Identifier" }, (p) => p)
    .with({ type: "ArrayPattern" }, (p) => ({
      span: p.span,
      type: "KArrayPattern",
      elements: p.elements.map((el) => el && sanitizePattern(el)),
      optional: p.optional,
    }))
    .with({ type: "RestElement" }, (p) => ({
      span: p.span,
      type: "KRestElement",
      rest: p.rest,
      argument: sanitizePattern(p.argument),
    }))
    .with({ type: "ObjectPattern" }, (p) => ({
      span: p.span,
      type: "KObjectPattern",
      properties: p.properties.map((prop) => {
        if (prop.type === "AssignmentPatternProperty") {
          return {
            span: prop.span,
            type: "KAssignmentPatternProperty",
            key: prop.key,
            value: prop.value && sanitizeExpression(prop.value),
          };
        } else if (prop.type === "KeyValuePatternProperty") {
          return {
            type: "KKeyValuePatternProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "KComputed",
                    expression: sanitizeExpression(prop.key.expression),
                  }
                : prop.key,
            value: sanitizePattern(prop.value),
          };
        } else if (prop.type === "RestElement") {
          return {
            span: prop.span,
            type: "KRestElement",
            rest: prop.rest,
            argument: sanitizePattern(prop.argument),
          };
        } else {
          prop;
          throw new Error(`Unreachable ("prop" has type never)`);
        }
      }),
      optional: p.optional,
    }))
    .with({ type: "AssignmentPattern" }, (p) => ({
      span: p.span,
      type: "KAssignmentPattern",
      left: sanitizePattern(p.left),
      right: sanitizeExpression(p.right),
    }))
    .with({ type: "Invalid" }, (p) => {
      throw new Error(`Invalid pattern at ${JSON.stringify(p.span)}`);
    })
    // otherwise, pattern is an expression
    .otherwise(() => sanitizeExpression(pattern as Expression));
