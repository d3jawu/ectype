import type { ModuleItem, Expression, Pattern, PropertyName } from "@swc/core";
import type {
  KBlockStatement,
  KExp,
  KNode,
  KProperty,
  KTemplateLiteral,
  KVariableDeclaration,
} from "../types/KytheraNode";

import { match } from "ts-pattern";
import { KPattern } from "../types/KPattern";

// Lowering simplifies some nodes and removes nodes not allowed in Kythera.
export const lower = (body: ModuleItem[]): KNode[] =>
  body.map((node) => lowerNode(node));

const lowerNode = (node: ModuleItem): KNode =>
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
      statements: node.stmts.map((st) => lowerNode(st)),
    }))
    .with({ type: "WhileStatement" }, (node) => ({
      span: node.span,
      type: "KWhileStatement",
      test: lowerExpression(node.test),
      body: lowerNode(node.body),
    }))
    .with({ type: "ForStatement" }, (node) => ({
      span: node.span,
      type: "KForStatement",
      init:
        node.init &&
        (node.init.type === "VariableDeclaration"
          ? (lowerNode(node.init) as KVariableDeclaration)
          : lowerExpression(node.init)),
      test: node.test && lowerExpression(node.test),
      update: node.update && lowerExpression(node.update),
      body: lowerNode(node.body),
    }))
    .with({ type: "IfStatement" }, (node) => ({
      span: node.span,
      type: "KIfStatement",
      test: lowerExpression(node.test),
      consequent: lowerNode(node.consequent),
      alternate: node.alternate && lowerNode(node.alternate),
    }))
    .with({ type: "ReturnStatement" }, (node) => ({
      span: node.span,
      type: "KReturnStatement",
      argument: node.argument && lowerExpression(node.argument),
    }))
    .with({ type: "LabeledStatement" }, (node) => ({
      span: node.span,
      type: "KLabeledStatement",
      label: node.label,
      body: lowerNode(node.body),
    }))
    .with({ type: "SwitchStatement" }, (node) => ({
      span: node.span,
      type: "KSwitchStatement",
      discriminant: lowerExpression(node.discriminant),
      cases: node.cases.map((c) => ({
        type: "KSwitchCase",
        span: c.span,
        test: c.test && lowerExpression(c.test),
        consequent: c.consequent.map((n) => lowerNode(n)),
      })),
    }))
    .with({ type: "TryStatement" }, (node) => ({
      span: node.span,
      type: "KTryStatement",
      block: lowerNode(node.block) as KBlockStatement,
      handler: node.handler && {
        span: node.handler.span,
        type: "KCatchClause",
        param: node.handler.param && lowerPattern(node.handler.param),
        body: lowerNode(node.handler.body) as KBlockStatement,
      },
      finalizer:
        node.finalizer && (lowerNode(node.finalizer) as KBlockStatement),
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
          id: lowerPattern(decl.id),
          init: decl.init && lowerExpression(decl.init),
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
      lowerExpression(val.expression)
    )

    // forbidden statements
    .with({ type: "DoWhileStatement" }, () => {
      throw new Error("Do-while statements are forbidden in Kythera.");
    })
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

const lowerExpression = (exp: Expression): KExp =>
  match<Expression, KExp>(exp)
    .with({ type: "NullLiteral" }, (exp) => exp)
    .with({ type: "BooleanLiteral" }, (exp) => exp)
    .with({ type: "NumericLiteral" }, (exp) => exp)
    .with({ type: "BigIntLiteral" }, (exp) => exp)
    .with({ type: "StringLiteral" }, (exp) => exp)
    .with({ type: "TaggedTemplateExpression" }, (exp) => ({
      span: exp.span,
      type: "KTaggedTemplateExpression",
      tag: lowerExpression(exp.tag),
      template: lowerExpression(exp.template) as KTemplateLiteral,
    }))
    .with({ type: "TemplateLiteral" }, (exp) => ({
      span: exp.span,
      type: "KTemplateLiteral",
      expressions: exp.expressions.map((e) => lowerExpression(e)),
      quasis: exp.quasis,
    }))
    .with({ type: "RegExpLiteral" }, () => {
      throw new Error("Regexes are not yet implemented.");
    })
    .with({ type: "ArrayExpression" }, (exp) => ({
      span: exp.span,
      type: "KArrayExpression",
      elements: exp.elements.map((el) => {
        if (!el) {
          return undefined;
        }

        return {
          spread: el.spread,
          expression: lowerExpression(el.expression),
        };
      }),
    }))
    // The SWC type definition for an arrow function expression has a "generator" flag, but
    // it's not syntactically possible for an arrow function to be a generator, so we don't
    // test for that here.
    .with({ type: "ArrowFunctionExpression" }, (exp) => ({
      span: exp.span,
      type: "KArrowFunctionExpression",
      params: exp.params.map((param) => lowerPattern(param)),
      body:
        exp.body.type === "BlockStatement"
          ? (lowerNode(exp.body) as KBlockStatement)
          : lowerExpression(exp.body),
      async: exp.async,
    }))
    .with({ type: "AssignmentExpression" }, (exp) => ({
      span: exp.span,
      type: "KAssignmentExpression",
      operator: exp.operator,
      left: lowerPattern(exp.left),
      right: lowerExpression(exp.right),
    }))
    .with({ type: "AwaitExpression" }, (exp) => ({
      span: exp.span,
      type: "KAwaitExpression",
      argument: lowerExpression(exp.argument),
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
        left: lowerExpression(exp.left),
        right: lowerExpression(exp.right),
      };
    })
    .with({ type: "CallExpression" }, (exp) => {
      if (exp.callee.type === "Super") {
        throw new Error("`super` is forbidden in Kythera.");
      }

      return {
        span: exp.span,
        type: "KCallExpression",
        callee:
          exp.callee.type === "Import"
            ? exp.callee
            : lowerExpression(exp.callee),
        arguments: exp.arguments.map((arg) => ({
          spread: arg.spread,
          expression: lowerExpression(arg.expression),
        })),
      };
    })
    .with({ type: "ConditionalExpression" }, (exp) => ({
      span: exp.span,
      type: "KConditionalExpression",
      test: lowerExpression(exp.test),
      consequent: lowerExpression(exp.consequent),
      alternate: lowerExpression(exp.alternate),
    }))
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
        object: lowerExpression(exp.object),
        property:
          exp.property.type === "Identifier"
            ? exp.property
            : {
                span: exp.property.span,
                type: "KComputed",
                expression: lowerExpression(exp.property.expression),
              },
      };
    })
    .with({ type: "ObjectExpression" }, (exp) => ({
      span: exp.span,
      type: "KObjectExpression",
      properties: exp.properties.map((prop) => {
        if (prop.type === "SpreadElement") {
          return {
            type: "KSpreadElement",
            spread: prop.spread,
            arguments: lowerExpression(prop.arguments),
          };
        }

        if (prop.type === "KeyValueProperty") {
          return {
            type: "KKeyValueProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "KComputed",
                    expression: lowerExpression(prop.key.expression),
                  }
                : prop.key,
            value: lowerExpression(prop.value),
          };
        }

        if (prop.type === "AssignmentProperty") {
          return {
            type: "KAssignmentProperty",
            key: prop.key,
            value: lowerExpression(prop.value),
          };
        }

        if (prop.type === "GetterProperty") {
          return {
            span: prop.span,
            type: "KGetterProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "KComputed",
                    expression: lowerExpression(prop.key.expression),
                  }
                : prop.key,
            body: prop.body && (lowerNode(prop.body) as KBlockStatement),
          };
        }

        if (prop.type === "SetterProperty") {
          return {
            span: prop.span,
            type: "KSetterProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "KComputed",
                    expression: lowerExpression(prop.key.expression),
                  }
                : prop.key,
            param: lowerPattern(prop.param),
            body: prop.body && (lowerNode(prop.body) as KBlockStatement),
          };
        }

        if (prop.type === "MethodProperty") {
          throw new Error(
            "Object methods are forbidden in Kythera. Use an arrow function member instead."
          );
        }

        if (prop.type === "Identifier") {
          return prop;
        }

        prop;
        throw new Error("Unreachable (prop has type never)");
      }),
    }))
    .with({ type: "ParenthesisExpression" }, (exp) =>
      lowerExpression(exp.expression)
    )
    .with({ type: "SequenceExpression" }, (exp) => ({
      span: exp.span,
      type: "KSequenceExpression",
      expressions: exp.expressions.map((e) => lowerExpression(e)),
    }))
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
        argument: lowerExpression(exp.argument),
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

const lowerPattern = (pattern: Pattern): KPattern =>
  match<Pattern, KPattern>(pattern)
    .with({ type: "Identifier" }, (p) => p)
    .with({ type: "ArrayPattern" }, (p) => ({
      span: p.span,
      type: "KArrayPattern",
      elements: p.elements.map((el) => el && lowerPattern(el)),
      optional: p.optional,
    }))
    .with({ type: "RestElement" }, (p) => ({
      span: p.span,
      type: "KRestElement",
      rest: p.rest,
      argument: lowerPattern(p.argument),
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
            value: prop.value && lowerExpression(prop.value),
          };
        }

        if (prop.type === "KeyValuePatternProperty") {
          return {
            type: "KKeyValuePatternProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "KComputed",
                    expression: lowerExpression(prop.key.expression),
                  }
                : prop.key,
            value: lowerPattern(prop.value),
          };
        }

        if (prop.type === "RestElement") {
          return {
            span: prop.span,
            type: "KRestElement",
            rest: prop.rest,
            argument: lowerPattern(prop.argument),
          };
        }

        prop;
        throw new Error(`Unreachable (prop has type never)`);
      }),
      optional: p.optional,
    }))
    .with({ type: "AssignmentPattern" }, (p) => ({
      span: p.span,
      type: "KAssignmentPattern",
      left: lowerPattern(p.left),
      right: lowerExpression(p.right),
    }))
    .with({ type: "Invalid" }, (p) => {
      throw new Error(`Invalid pattern at ${JSON.stringify(p.span)}`);
    })
    // otherwise, pattern is an expression
    .otherwise(() => lowerExpression(pattern as Expression));