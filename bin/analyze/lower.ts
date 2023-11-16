import type {
  AssignmentProperty,
  Expression,
  ModuleDeclaration,
  Pattern,
  Property,
  SpreadElement,
  Statement,
} from "acorn";
import type {
  ECBlockStatement,
  ECExp,
  ECNode,
  ECProperty,
  ECSpreadElement,
  ECTemplateLiteral,
  ECVariableDeclaration,
} from "../types/ECNode";

import { match } from "ts-pattern";
import { ECPattern } from "../types/ECPattern";

// Lowering simplifies some nodes and removes nodes not allowed in Ectype.
export const lower = (body: (Statement | ModuleDeclaration)[]): ECNode[] =>
  body.map((node) => lowerNode(node));

const lowerNode = (node: Statement | ModuleDeclaration): ECNode =>
  match<Statement | ModuleDeclaration, ECNode>(node)
    // direct passthroughs
    .with({ type: "DebuggerStatement" }, (node) => node)
    .with({ type: "EmptyStatement" }, (node) => node)
    .with({ type: "BreakStatement" }, (node) => node)
    .with({ type: "ContinueStatement" }, (node) => node)

    // statements with rewrites onto Ectype nodes
    .with({ type: "BlockStatement" }, (node) => ({
      ...node,
      type: "ECBlockStatement",
      body: node.body.map((st) => lowerNode(st)),
    }))
    .with({ type: "WhileStatement" }, (node) => ({
      ...node,
      type: "ECWhileStatement",
      test: lowerExpression(node.test),
      body: lowerNode(node.body),
    }))
    .with({ type: "ForStatement" }, (node) => ({
      ...node,
      type: "ECForStatement",
      init:
        (node.init &&
          (node.init.type === "VariableDeclaration"
            ? (lowerNode(node.init) as ECVariableDeclaration)
            : lowerExpression(node.init))) ||
        undefined,
      test: (node.test && lowerExpression(node.test)) || undefined,
      update: (node.update && lowerExpression(node.update)) || undefined,
      body: lowerNode(node.body),
    }))
    .with({ type: "IfStatement" }, (node) => ({
      ...node,
      type: "ECIfStatement",
      test: lowerExpression(node.test),
      consequent: lowerNode(node.consequent),
      alternate: (node.alternate && lowerNode(node.alternate)) || undefined,
    }))
    .with({ type: "ReturnStatement" }, (node) => ({
      ...node,
      type: "ECReturnStatement",
      argument: (node.argument && lowerExpression(node.argument)) || undefined,
    }))
    .with({ type: "LabeledStatement" }, (node) => ({
      ...node,
      type: "ECLabeledStatement",
      label: node.label,
      body: lowerNode(node.body),
    }))
    .with({ type: "SwitchStatement" }, (node) => ({
      ...node,
      type: "ECSwitchStatement",
      discriminant: lowerExpression(node.discriminant),
      cases: node.cases.map((c) => ({
        ...c,
        type: "ECSwitchCase",
        test: (c.test && lowerExpression(c.test)) || undefined,
        consequent: c.consequent.map((n) => lowerNode(n)),
      })),
    }))
    .with({ type: "TryStatement" }, (node) => ({
      ...node,
      type: "ECTryStatement",
      block: lowerNode(node.block) as ECBlockStatement,
      handler:
        (node.handler && {
          ...node.handler,
          type: "ECCatchClause",
          param:
            (node.handler.param && lowerPattern(node.handler.param)) ||
            undefined,
          body: lowerNode(node.handler.body) as ECBlockStatement,
        }) ||
        undefined,
      finalizer:
        (node.finalizer && (lowerNode(node.finalizer) as ECBlockStatement)) ||
        undefined,
    }))
    .with({ type: "VariableDeclaration" }, (node) => {
      if (node.kind === "var") {
        throw new Error(
          "`var` is forbidden in Ectype. Use `const` or `let` instead."
        );
      }

      return {
        ...node,
        type: "ECVariableDeclaration",
        kind: node.kind,
        declarations: node.declarations.map((decl) => ({
          ...decl,
          type: "ECVariableDeclarator",
          id: lowerPattern(decl.id),
          init: (decl.init && lowerExpression(decl.init)) || undefined,
        })),
      };
    })

    // import and export

    // TODO: check against naming an export "default"?
    .with({ type: "ExportNamedDeclaration" }, (node) => {
      if (node.declaration !== null) {
        throw new Error("Exports with declarations are forbidden in Ectype.");
      }

      if (node.source !== null) {
        throw new Error("Re-exports are not yet supported.");
      }

      return {
        ...node,
        type: "ECExportNamedDeclaration",
        specifiers: node.specifiers.map((spec) => ({
          ...spec,
          type: "ECExportSpecifier",
          exported:
            spec.exported.type === "Identifier"
              ? spec.exported.name
              : String(spec.exported.value),
          local:
            spec.local.type === "Identifier"
              ? spec.local.name
              : String(spec.local.value),
        })),
      };
    })
    // TODO: check for default imports
    .with({ type: "ImportDeclaration" }, (node) => ({
      ...node,
      type: "ECImportDeclaration",
      specifiers: node.specifiers.map((spec) => {
        if (spec.type !== "ImportSpecifier") {
          throw new Error(`Default and named imports are not yet supported.`);
        }

        return {
          ...spec,
          type: "ECImportSpecifier",
          imported:
            spec.imported.type === "Identifier"
              ? spec.imported.name
              : String(spec.imported.value),
          local: spec.local.name,
        };
      }),
      source: String(node.source.value),
    }))

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
    .with({ type: "ExportDefaultDeclaration" }, () => {
      throw new Error(
        "`export default` is forbidden in Ectype. Use a non-default `export` instead."
      );
    })
    .with({ type: "ForInStatement" }, () => {
      throw new Error("`for in` is not currently supported in Ectype.");
    })
    .with({ type: "ForOfStatement" }, () => {
      throw new Error("`for of` is not currently supported in Ectype.");
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
    .exhaustive();

const lowerExpression = (exp: Expression): ECExp =>
  match<Expression, ECExp>(exp)
    .with({ type: "Literal" }, (literal) => {
      if (typeof literal.value === "boolean") {
        return {
          ...literal,
          type: "ECBooleanLiteral",
          value: literal.value,
        };
      } else if (typeof literal.value === "number") {
        return {
          ...literal,
          type: "ECNumberLiteral",
          value: literal.value,
        };
      } else if (typeof literal.value === "string") {
        return {
          ...literal,
          type: "ECStringLiteral",
          value: literal.value,
        };
      } else if (typeof literal.value === "bigint") {
        return {
          ...literal,
          type: "ECBigIntLiteral",
          value: literal.value,
        };
      } else if (typeof literal.value === "object") {
        if (literal.regex) {
          return {
            ...literal,
            ...literal.regex,
            type: "ECRegexp",
          };
        } else if (literal.value === null) {
          return {
            ...literal,
            type: "ECNullLiteral",
          };
        } else {
          throw new Error(`Invalid literal object: ${literal}`);
        }
      } else {
        throw new Error(`Invalid literal: ${literal}`);
      }
    })
    .with({ type: "TaggedTemplateExpression" }, (exp) => ({
      ...exp,
      type: "ECTaggedTemplateExpression",
      tag: lowerExpression(exp.tag),
      quasi: lowerExpression(exp.quasi) as ECTemplateLiteral,
    }))
    .with({ type: "TemplateLiteral" }, (exp) => ({
      ...exp,
      type: "ECTemplateLiteral",
      expressions: exp.expressions.map((e) => lowerExpression(e)),
      quasis: exp.quasis,
    }))
    .with({ type: "ArrayExpression" }, (exp) => ({
      ...exp,
      type: "ECArrayExpression",
      elements: exp.elements.map((el) => {
        if (el === null) {
          return null;
        }

        if (el.type === "SpreadElement") {
          return lowerSpreadElement(el);
        }

        return lowerExpression(el);
      }),
    }))
    // The type definition for an ArrowFunctionExpression has a "generator" flag,
    // but it's not syntactically possible for an arrow function to be a generator,
    // so we don't test for that here.
    .with({ type: "ArrowFunctionExpression" }, (exp) => ({
      ...exp,
      type: "ECArrowFunctionExpression",
      params: exp.params.map((param) => lowerPattern(param)),
      body:
        exp.body.type === "BlockStatement"
          ? (lowerNode(exp.body) as ECBlockStatement)
          : lowerExpression(exp.body),
      async: exp.async,
    }))
    .with({ type: "AssignmentExpression" }, (exp) => ({
      ...exp,
      type: "ECAssignmentExpression",
      operator: exp.operator,
      left: lowerPattern(exp.left),
      right: lowerExpression(exp.right),
    }))
    .with({ type: "AwaitExpression" }, (exp) => ({
      ...exp,
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

      if (exp.left.type === "PrivateIdentifier") {
        throw new Error(`Private identifiers are forbidden in Ectype.`);
      }

      return {
        ...exp,
        type: "ECBinaryExpression",
        operator: exp.operator,
        left: lowerExpression(exp.left),
        right: lowerExpression(exp.right),
      };
    })
    .with({ type: "LogicalExpression" }, (exp) => ({
      ...exp,
      type: "ECLogicalExpression",
      left: lowerExpression(exp.left),
      right: lowerExpression(exp.right),
    }))
    .with({ type: "CallExpression" }, (exp) => {
      if (exp.callee.type === "Super") {
        throw new Error("`super` is forbidden in Ectype.");
      }

      if (exp.optional) {
        throw new Error(
          `Optional function calls with ?.() are forbidden in Ectype.`
        );
      }

      // js() special function
      if (exp.callee.type === "Identifier" && exp.callee.name === "js") {
        if (exp.arguments.length !== 1 && exp.arguments.length !== 2) {
          throw new Error(
            `Expected 1 or 2 arguments to js() but got ${exp.arguments.length}`
          );
        }

        if (exp.arguments[0].type !== "ArrowFunctionExpression") {
          throw new Error(`First parameter to js() must be an arrow function.`);
        }

        if (exp.arguments[1]?.type === "SpreadElement") {
          throw new Error(`Second parameter to js() cannot be a spread.`);
        }

        // Keep the call expression node the same, but don't lower the function body.

        return {
          ...exp,
          type: "ECCallExpression",
          callee: lowerExpression(exp.callee),
          arguments: [
            {
              ...exp.arguments[0],
              params: [],
              // Replace body with a null literal node so it can be valid to TypeScript.
              // The function body is not read by the type-checker anyway.
              body: {
                start: exp.arguments[0].body.start,
                end: exp.arguments[0].body.end,
                range: exp.arguments[0].body?.range,
                loc: exp.arguments[0].body?.loc,
                type: "ECNullLiteral",
              },
              type: "ECArrowFunctionExpression",
            },
            lowerExpression(exp.arguments[1]),
          ],
        };
      }

      return {
        ...exp,
        type: "ECCallExpression",
        callee: lowerExpression(exp.callee),
        arguments: exp.arguments.map((arg) => {
          if (arg.type === "SpreadElement") {
            return lowerSpreadElement(arg);
          } else {
            return lowerExpression(arg);
          }
        }),
      };
    })
    .with({ type: "ConditionalExpression" }, (exp) => ({
      ...exp,
      type: "ECConditionalExpression",
      test: lowerExpression(exp.test),
      consequent: lowerExpression(exp.consequent),
      alternate: lowerExpression(exp.alternate),
    }))
    .with({ type: "Identifier" }, (exp) => ({
      ...exp,
      type: "ECIdentifier",
    }))
    .with({ type: "ImportExpression" }, (exp) => ({
      ...exp,
      type: "ECImportExpression",
      source: lowerExpression(exp),
    }))
    .with({ type: "MemberExpression" }, (exp) => {
      // Computed properties are valid for arrays but not structs, so
      // they are weeded out later when type-checking information is availble.

      if (exp.property.type === "PrivateIdentifier") {
        throw new Error("Private identifiers are forbidden in Ectype.");
      }

      if (exp.object.type === "Super") {
        throw new Error("`super` is forbidden in Ectype.");
      }

      // TODO: check if member expression is a keyword function, e.g. Type.sub

      return {
        ...exp,
        type: "ECMemberExpression",
        object: lowerExpression(exp.object),
        property: lowerExpression(exp.property),
      };
    })
    .with({ type: "ObjectExpression" }, (exp) => ({
      ...exp,
      type: "ECObjectExpression",
      properties: exp.properties.map((prop) => {
        if (prop.type === "SpreadElement") {
          return lowerSpreadElement(prop);
        } else {
          return lowerProperty(prop);
        }
      }),
    }))
    .with({ type: "ParenthesizedExpression" }, (exp) =>
      lowerExpression(exp.expression)
    )
    .with({ type: "SequenceExpression" }, (exp) => ({
      ...exp,
      type: "ECSequenceExpression",
      expressions: exp.expressions.map((e) => lowerExpression(e)),
    }))
    .with({ type: "UnaryExpression" }, (exp) => {
      if (!exp.prefix) {
        throw new Error(
          `Postfix operators are forbidden in Ectype (got ${exp.operator}).`
        );
      }

      if (
        exp.operator === "typeof" ||
        exp.operator === "void" ||
        exp.operator === "delete"
      ) {
        throw new Error(`${exp.operator} is forbidden in Ectype.`);
      }

      return {
        ...exp,
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
    .with({ type: "ChainExpression" }, () => {
      throw new Error(
        "Optional chain `?.` expressions are forbidden in Ectype."
      );
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
    .exhaustive();

const lowerPattern = (pattern: Pattern): ECPattern =>
  match<Pattern, ECPattern>(pattern)
    .with({ type: "Identifier" }, (pat) => ({
      ...pat,
      type: "ECIdentifier",
    }))
    .with({ type: "MemberExpression" }, (pat) => {
      // This is the same behavior lowering a MemberExpression node, but I
      // think they might diverge later.
      if (pat.property.type === "PrivateIdentifier") {
        throw new Error("Private identifiers are forbidden in Ectype.");
      }

      if (pat.object.type === "Super") {
        throw new Error("`super` is forbidden in Ectype.");
      }

      return {
        ...pat,
        type: "ECMemberExpression",
        object: lowerExpression(pat.object),
        property: lowerExpression(pat.property),
      };
    })
    .with({ type: "ObjectPattern" }, (pat) => ({
      ...pat,
      type: "ECObjectPattern",
      properties: pat.properties.map((prop) => {
        if (prop.type === "Property") {
          return lowerProperty(prop);
        } else if (prop.type === "RestElement") {
          return {
            ...prop,
            type: "ECRestElement",
            argument: lowerPattern(prop.argument),
          };
        }

        prop;
        throw new Error("Unreachable (prop has type never)");
      }),
    }))
    .with({ type: "ArrayPattern" }, (pat) => ({
      ...pat,
      type: "ECArrayPattern",
      elements: pat.elements.map((el) => {
        if (el === null) {
          return null;
        }

        return lowerPattern(el);
      }),
    }))
    .with({ type: "RestElement" }, (pat) => ({
      ...pat,
      type: "ECRestElement",
      argument: lowerPattern(pat.argument),
    }))
    .with({ type: "AssignmentPattern" }, (pat) => ({
      ...pat,
      type: "ECAssignmentPattern",
      left: lowerPattern(pat.left),
      right: lowerExpression(pat.right),
    }))
    .exhaustive();

// Some reusable handlers.

const lowerProperty = (prop: Property | AssignmentProperty): ECProperty => {
  if (prop.kind === "get" || prop.kind === "set") {
    throw new Error(`${prop.kind}ters are forbidden in Ectype.`);
  }

  if (prop.method) {
    throw new Error(
      "Object methods are forbidden in Ectype. Use an arrow function expression instead."
    );
  }

  if (prop.computed) {
    throw new Error(
      "Computed object field accesses are currently forbidden in Ectype."
    );
  }

  return {
    ...prop,
    type: "ECProperty",
    key: lowerExpression(prop.key),
    value:
      prop.value.type === "ObjectPattern" ||
      prop.value.type === "RestElement" ||
      prop.value.type === "ArrayPattern" ||
      prop.value.type === "AssignmentPattern"
        ? lowerPattern(prop.value)
        : lowerExpression(prop.value),
  };
};

const lowerSpreadElement = (el: SpreadElement): ECSpreadElement => ({
  ...el,
  type: "ECSpreadElement",
  argument: lowerExpression(el.argument),
});
