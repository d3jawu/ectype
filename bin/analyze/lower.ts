import type {
  AssignmentProperty,
  Expression,
  Identifier,
  ModuleDeclaration,
  Node,
  Pattern,
  Property,
  SpreadElement,
  Statement,
} from "acorn";
import type {
  ECBlockStatement,
  ECExp,
  ECMemberExpression,
  ECNode,
  ECProperty,
  ECSpreadElement,
  ECTemplateLiteral,
  ECVariableDeclaration,
} from "../types/ECNode";

import { match } from "ts-pattern";
import { ECPattern } from "../types/ECPattern";
import type { ErrorSpan } from "../types/Error.js";

const forbiddenError = (
  behavior: string,
  node: Node,
  remark?: string
): ErrorSpan => ({
  code: "FORBIDDEN",
  meta: {
    behavior,
  },
  start: node.start,
  end: node.end,
  loc: node.loc || undefined,
  remark,
});

const unimplementedError = (
  features: string,
  node: Node,
  remark?: string
): ErrorSpan => ({
  code: "UNIMPLEMENTED",
  meta: {
    features,
  },
  start: node.start,
  end: node.end,
  loc: node.loc || undefined,
  remark,
});

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
        throw forbiddenError('"var"', node);
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
        throw unimplementedError("exports with declarations", node);
      }

      if (node.source !== null) {
        throw unimplementedError("re-exports", node);
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
          throw unimplementedError(`default and named imports`, spec);
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
      throw forbiddenError("do-while", node);
    })
    .with({ type: "ExportAllDeclaration" }, () => {
      throw forbiddenError("export-all", node);
    })
    .with({ type: "ExportDefaultDeclaration" }, () => {
      throw forbiddenError('"export default"', node);
    })
    .with({ type: "ForInStatement" }, () => {
      throw unimplementedError('"for in" loops', node);
    })
    .with({ type: "ForOfStatement" }, () => {
      throw unimplementedError('"for of" loops', node);
    })
    .with({ type: "FunctionDeclaration" }, () => {
      throw forbiddenError("function", node, "use an arrow function instead");
    })
    .with({ type: "ThrowStatement" }, () => {
      throw forbiddenError('"throw"', node);
    })
    .with({ type: "WithStatement" }, () => {
      throw forbiddenError('"with"', node);
    })
    .with({ type: "ClassDeclaration" }, () => {
      throw forbiddenError("class declarations", node);
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
        throw forbiddenError(`"${exp.operator}"`, exp);
      }

      if (exp.left.type === "PrivateIdentifier") {
        throw forbiddenError("using private identifiers", exp.left);
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
        throw forbiddenError('"super"', exp.callee);
      }

      if (exp.optional) {
        throw forbiddenError("optional function calls", exp);
      }

      // js() special function
      if (exp.callee.type === "Identifier" && exp.callee.name === "js") {
        if (exp.arguments.length !== 1 && exp.arguments.length !== 2) {
          throw {
            code: "ARG_COUNT_MISMATCH",
            meta: {
              received: exp.arguments.length,
              expected: 2,
            },
            start: exp.start,
            end: exp.end,
            loc: exp.loc,
            remark: "second argument is optional",
          } as ErrorSpan;
        }

        if (exp.arguments[0].type !== "ArrowFunctionExpression") {
          throw {
            code: "INVALID_JS",
            meta: {},
            start: exp.start,
            end: exp.end,
            loc: exp.loc,
            remark: "first argument to js() must be an arrow function",
          } as ErrorSpan;
        }

        if (exp.arguments[1]?.type === "SpreadElement") {
          throw {
            code: "NOT_ALLOWED_HERE",
            meta: {
              syntax: "spread element",
            },
            start: exp.start,
            end: exp.end,
            loc: exp.loc,
          } as ErrorSpan;
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
            ...(!!exp.arguments[1] ? [lowerExpression(exp.arguments[1])] : []),
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
      source: lowerExpression(exp.source),
    }))
    .with({ type: "MemberExpression" }, (exp) => {
      // Computed properties are valid for arrays but not structs, so
      // they are weeded out later when type-checking information is availble.

      if (exp.property.type === "PrivateIdentifier") {
        throw forbiddenError("using private identifiers", exp.property);
      }

      if (exp.object.type === "Super") {
        throw forbiddenError('"super"', exp.object);
      }

      // TODO: check if member expression is a keyword function, e.g. Type.sub

      return {
        ...exp,
        type: "ECMemberExpression",
        object: lowerExpression(exp.object),
        property: exp.computed
          ? lowerExpression(exp.property)
          : (exp.property as Identifier).name,
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
        throw forbiddenError(`"${exp.operator}"`, exp);
      }

      if (
        exp.operator === "typeof" ||
        exp.operator === "void" ||
        exp.operator === "delete"
      ) {
        throw forbiddenError(`"${exp.operator}`, exp);
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
      throw forbiddenError('"class"', exp);
    })
    .with({ type: "FunctionExpression" }, () => {
      throw forbiddenError('"function"', exp, "use an arrow function instead");
    })
    .with({ type: "MetaProperty" }, () => {
      throw unimplementedError("meta-properties", exp);
    })
    .with({ type: "NewExpression" }, () => {
      throw forbiddenError('"new"', exp);
    })
    .with({ type: "ChainExpression" }, () => {
      throw forbiddenError('optional chain "?."', exp);
    })
    .with({ type: "ThisExpression" }, () => {
      throw forbiddenError('"this"', exp);
    })
    .with({ type: "UpdateExpression" }, () => {
      throw forbiddenError("using postfix operators", exp);
    })
    .with({ type: "YieldExpression" }, () => {
      throw forbiddenError('"yield"', exp);
    })
    .exhaustive();

const lowerPattern = (pattern: Pattern): ECPattern =>
  match<Pattern, ECPattern>(pattern)
    .with({ type: "Identifier" }, (pat) => ({
      ...pat,
      type: "ECIdentifier",
    }))
    .with({ type: "MemberExpression" }, (pat) => {
      return lowerExpression(pat) as ECMemberExpression;
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
    throw forbiddenError(`using ${prop.kind}ters`, prop);
  }

  if (prop.method) {
    throw forbiddenError(
      "using object methods",
      prop,
      "use an fn member instead"
    );
  }

  if (prop.computed) {
    throw unimplementedError("computed fields", prop);
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
