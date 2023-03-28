import type { ModuleItem, Expression, Pattern, PropertyName } from "@swc/core";
import type {
  ECBlockStatement,
  ECExp,
  ECNode,
  ECProperty,
  ECTemplateLiteral,
  ECVariableDeclaration,
} from "../types/ECNode";

import { match } from "ts-pattern";
import { ECPattern } from "../types/ECPattern";

// Lowering simplifies some nodes and removes nodes not allowed in Ectype.
export const lower = (body: ModuleItem[]): ECNode[] =>
  body.map((node) => lowerNode(node));

const lowerNode = (node: ModuleItem): ECNode =>
  match<ModuleItem, ECNode>(node)
    // direct passthroughs
    .with({ type: "DebuggerStatement" }, (node) => node)
    .with({ type: "EmptyStatement" }, (node) => node)
    .with({ type: "BreakStatement" }, (node) => node)
    .with({ type: "ContinueStatement" }, (node) => node)

    // statements with rewrites onto Ectype nodes
    .with({ type: "BlockStatement" }, (node) => ({
      span: node.span,
      type: "ECBlockStatement",
      statements: node.stmts.map((st) => lowerNode(st)),
    }))
    .with({ type: "WhileStatement" }, (node) => ({
      span: node.span,
      type: "ECWhileStatement",
      test: lowerExpression(node.test),
      body: lowerNode(node.body),
    }))
    .with({ type: "ForStatement" }, (node) => ({
      span: node.span,
      type: "ECForStatement",
      init:
        node.init &&
        (node.init.type === "VariableDeclaration"
          ? (lowerNode(node.init) as ECVariableDeclaration)
          : lowerExpression(node.init)),
      test: node.test && lowerExpression(node.test),
      update: node.update && lowerExpression(node.update),
      body: lowerNode(node.body),
    }))
    .with({ type: "IfStatement" }, (node) => ({
      span: node.span,
      type: "ECIfStatement",
      test: lowerExpression(node.test),
      consequent: lowerNode(node.consequent),
      alternate: node.alternate && lowerNode(node.alternate),
    }))
    .with({ type: "ReturnStatement" }, (node) => ({
      span: node.span,
      type: "ECReturnStatement",
      argument: node.argument && lowerExpression(node.argument),
    }))
    .with({ type: "LabeledStatement" }, (node) => ({
      span: node.span,
      type: "ECLabeledStatement",
      label: node.label,
      body: lowerNode(node.body),
    }))
    .with({ type: "SwitchStatement" }, (node) => ({
      span: node.span,
      type: "ECSwitchStatement",
      discriminant: lowerExpression(node.discriminant),
      cases: node.cases.map((c) => ({
        type: "ECSwitchCase",
        span: c.span,
        test: c.test && lowerExpression(c.test),
        consequent: c.consequent.map((n) => lowerNode(n)),
      })),
    }))
    .with({ type: "TryStatement" }, (node) => ({
      span: node.span,
      type: "ECTryStatement",
      block: lowerNode(node.block) as ECBlockStatement,
      handler: node.handler && {
        span: node.handler.span,
        type: "ECCatchClause",
        param: node.handler.param && lowerPattern(node.handler.param),
        body: lowerNode(node.handler.body) as ECBlockStatement,
      },
      finalizer:
        node.finalizer && (lowerNode(node.finalizer) as ECBlockStatement),
    }))
    .with({ type: "VariableDeclaration" }, (node) => {
      if (node.kind === "var") {
        throw new Error(
          "`var` is forbidden in Ectype. Use `const` or `let` instead."
        );
      }

      return {
        span: node.span,
        type: "ECVariableDeclaration",
        kind: node.kind,
        declare: node.declare,
        declarations: node.declarations.map((decl) => ({
          span: decl.span,
          type: "ECVariableDeclarator",
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
      throw new Error("Do-while statements are forbidden in Ectype.");
    })
    .with({ type: "ExportAllDeclaration" }, () => {
      throw new Error("Export-all declarations are forbidden in Ectype.");
    })
    .with({ type: "ExportDefaultExpression" }, () => {
      throw new Error("Default exports are forbidden in Ectype.");
    })
    .with({ type: "ExportDefaultDeclaration" }, () => {
      throw new Error(
        "`export default` is forbidden in Ectype. Use a non-default `export` instead."
      );
    })
    .with({ type: "ForInStatement" }, () => {
      throw new Error("`for in` is forbidden in Ectype.");
    })
    .with({ type: "ForOfStatement" }, () => {
      throw new Error("`for of` is forbidden in Ectype.");
    })
    .with({ type: "FunctionDeclaration" }, () => {
      throw new Error(
        "`function` declarations are forbidden in Ectype. Use an arrow function () => {} instead."
      );
    })
    .with({ type: "ThrowStatement" }, () => {
      throw new Error("`throw` is forbidden in Ectype.");
    })
    .with({ type: "WithStatement" }, () => {
      throw new Error("`with` is forbidden in Ectype.");
    })
    .with({ type: "ClassDeclaration" }, () => {
      throw new Error("`class` declarations are forbidden in Ectype.");
    })
    .otherwise(() => {
      throw new Error(`Invalid node: ${node.type}`);
    });

const lowerExpression = (exp: Expression): ECExp =>
  match<Expression, ECExp>(exp)
    .with({ type: "NullLiteral" }, (exp) => exp)
    .with({ type: "BooleanLiteral" }, (exp) => exp)
    .with({ type: "NumericLiteral" }, (exp) => exp)
    .with({ type: "BigIntLiteral" }, (exp) => exp)
    .with({ type: "StringLiteral" }, (exp) => exp)
    .with({ type: "TaggedTemplateExpression" }, (exp) => ({
      span: exp.span,
      type: "ECTaggedTemplateExpression",
      tag: lowerExpression(exp.tag),
      template: lowerExpression(exp.template) as ECTemplateLiteral,
    }))
    .with({ type: "TemplateLiteral" }, (exp) => ({
      span: exp.span,
      type: "ECTemplateLiteral",
      expressions: exp.expressions.map((e) => lowerExpression(e)),
      quasis: exp.quasis,
    }))
    .with({ type: "RegExpLiteral" }, () => {
      throw new Error("Regexes are not yet implemented.");
    })
    .with({ type: "ArrayExpression" }, (exp) => ({
      span: exp.span,
      type: "ECArrayExpression",
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
      type: "ECArrowFunctionExpression",
      params: exp.params.map((param) => lowerPattern(param)),
      body:
        exp.body.type === "BlockStatement"
          ? (lowerNode(exp.body) as ECBlockStatement)
          : lowerExpression(exp.body),
      async: exp.async,
    }))
    .with({ type: "AssignmentExpression" }, (exp) => ({
      span: exp.span,
      type: "ECAssignmentExpression",
      operator: exp.operator,
      left: lowerPattern(exp.left),
      right: lowerExpression(exp.right),
    }))
    .with({ type: "AwaitExpression" }, (exp) => ({
      span: exp.span,
      type: "ECAwaitExpression",
      argument: lowerExpression(exp.argument),
    }))
    .with({ type: "BinaryExpression" }, (exp) => {
      if (
        exp.operator === "==" ||
        exp.operator === "!=" ||
        exp.operator === "in" ||
        exp.operator === "instanceof"
      ) {
        throw new Error(`\`${exp.operator}\` is forbidden in Ectype.`);
      }

      return {
        span: exp.span,
        type: "ECBinaryExpression",
        operator: exp.operator,
        left: lowerExpression(exp.left),
        right: lowerExpression(exp.right),
      };
    })
    .with({ type: "CallExpression" }, (exp) => {
      if (exp.callee.type === "Super") {
        throw new Error("`super` is forbidden in Ectype.");
      }

      return {
        span: exp.span,
        type: "ECCallExpression",
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
      type: "ECConditionalExpression",
      test: lowerExpression(exp.test),
      consequent: lowerExpression(exp.consequent),
      alternate: lowerExpression(exp.alternate),
    }))
    .with({ type: "Identifier" }, (exp) => exp)
    .with({ type: "MemberExpression" }, (exp) => {
      // Computed properties are valid for arrays but not structs, so
      // they are weeded out later when type-checking information is availble.

      if (exp.property.type === "PrivateName") {
        throw new Error("Private names are forbidden in Ectype.");
      }

      // TODO: check if member expression is a keyword function, e.g. Type.sub

      return {
        span: exp.span,
        type: "ECMemberExpression",
        object: lowerExpression(exp.object),
        property:
          exp.property.type === "Identifier"
            ? exp.property
            : {
                span: exp.property.span,
                type: "ECComputed",
                expression: lowerExpression(exp.property.expression),
              },
      };
    })
    .with({ type: "ObjectExpression" }, (exp) => ({
      span: exp.span,
      type: "ECObjectExpression",
      properties: exp.properties.map((prop) => {
        if (prop.type === "SpreadElement") {
          return {
            type: "ECSpreadElement",
            spread: prop.spread,
            arguments: lowerExpression(prop.arguments),
          };
        }

        if (prop.type === "KeyValueProperty") {
          return {
            type: "ECKeyValueProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "ECComputed",
                    expression: lowerExpression(prop.key.expression),
                  }
                : prop.key,
            value: lowerExpression(prop.value),
          };
        }

        if (prop.type === "AssignmentProperty") {
          return {
            type: "ECAssignmentProperty",
            key: prop.key,
            value: lowerExpression(prop.value),
          };
        }

        if (prop.type === "GetterProperty" || prop.type === "SetterProperty") {
          throw new Error(
            `Getter and setter properties are forbidden in Ectype.`
          );
        }

        if (prop.type === "MethodProperty") {
          throw new Error(
            "Object methods are forbidden in Ectype. Use an arrow function member instead."
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
      type: "ECSequenceExpression",
      expressions: exp.expressions.map((e) => lowerExpression(e)),
    }))
    .with({ type: "UnaryExpression" }, (exp) => {
      if (
        exp.operator === "typeof" ||
        exp.operator === "void" ||
        exp.operator === "delete"
      ) {
        throw new Error(`${exp.operator} is forbidden in Ectype.`);
      }

      return {
        span: exp.span,
        type: "ECUnaryExpression",
        operator: exp.operator,
        argument: lowerExpression(exp.argument),
      };
    })

    // forbidden expressions
    .with({ type: "ClassExpression" }, () => {
      throw new Error("`class` expressions are forbidden in Ectype.");
    })
    .with({ type: "FunctionExpression" }, () => {
      throw new Error(
        "`function` expressions are forbidden in Ectype. Use an arrow function () => {} instead."
      );
    })
    .with({ type: "MetaProperty" }, () => {
      throw new Error("No meta-properties are supported in Ectype.");
    })
    .with({ type: "NewExpression" }, () => {
      throw new Error("`new` is forbidden in Ectype.");
    })
    .with({ type: "OptionalChainingExpression" }, () => {
      throw new Error(
        "Optional chain `?.` expressions are forbidden in Ectype."
      );
    })
    .with({ type: "PrivateName" }, () => {
      throw new Error("Private names are not currently supported in Ectype.");
    })
    .with({ type: "SuperPropExpression" }, () => {
      throw new Error("Super props are forbidden in Ectype.");
    })
    .with({ type: "ThisExpression" }, () => {
      throw new Error("`this` is forbidden in Ectype.");
    })
    .with({ type: "UpdateExpression" }, () => {
      throw new Error("++ and -- are forbidden in Ectype.");
    })
    .with({ type: "YieldExpression" }, () => {
      throw new Error("Yield expressions are forbidden in Ectype.");
    })
    .otherwise(() => {
      throw new Error(`Invalid expression node: ${exp.type}`);
    });

const lowerPattern = (pattern: Pattern): ECPattern =>
  match<Pattern, ECPattern>(pattern)
    .with({ type: "Identifier" }, (p) => p)
    .with({ type: "ArrayPattern" }, (p) => ({
      span: p.span,
      type: "ECArrayPattern",
      elements: p.elements.map((el) => el && lowerPattern(el)),
      optional: p.optional,
    }))
    .with({ type: "RestElement" }, (p) => ({
      span: p.span,
      type: "ECRestElement",
      rest: p.rest,
      argument: lowerPattern(p.argument),
    }))
    .with({ type: "ObjectPattern" }, (p) => ({
      span: p.span,
      type: "ECObjectPattern",
      properties: p.properties.map((prop) => {
        if (prop.type === "AssignmentPatternProperty") {
          return {
            span: prop.span,
            type: "ECAssignmentPatternProperty",
            key: prop.key,
            value: prop.value && lowerExpression(prop.value),
          };
        }

        if (prop.type === "KeyValuePatternProperty") {
          return {
            type: "ECKeyValuePatternProperty",
            key:
              prop.key.type === "Computed"
                ? {
                    span: prop.key.span,
                    type: "ECComputed",
                    expression: lowerExpression(prop.key.expression),
                  }
                : prop.key,
            value: lowerPattern(prop.value),
          };
        }

        if (prop.type === "RestElement") {
          return {
            span: prop.span,
            type: "ECRestElement",
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
      type: "ECAssignmentPattern",
      left: lowerPattern(p.left),
      right: lowerExpression(p.right),
    }))
    .with({ type: "Invalid" }, (p) => {
      throw new Error(`Invalid pattern at ${JSON.stringify(p.span)}`);
    })
    // otherwise, pattern is an expression
    .otherwise(() => lowerExpression(pattern as Expression));
