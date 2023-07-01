import type {
  AssignmentOperator,
  BigIntLiteral,
  BooleanLiteral,
  BreakStatement,
  ContinueStatement,
  DebuggerStatement,
  EmptyStatement,
  ExportNamedDeclaration,
  HasSpan,
  Identifier,
  Import,
  ImportDeclaration,
  ImportSpecifier,
  Node,
  NullLiteral,
  NumericLiteral,
  Span,
  StringLiteral,
  TemplateElement,
} from "@swc/core";

import type { Type } from "../../core/types";
import type { ECPattern } from "./ECPattern";

export type ECNode = ECExp | ECStatement;

export type ECStatement =
  | DebuggerStatement
  | EmptyStatement
  | ECBlockStatement
  | BreakStatement
  | ContinueStatement
  | ExportNamedDeclaration
  | ImportDeclaration
  | ECVariableDeclaration
  | ECForStatement
  | ECSwitchStatement
  | ECWhileStatement
  | ECTryStatement
  | ECIfStatement
  | ECReturnStatement
  | ECLabeledStatement;

// Ectype versions of SWC statement nodes.

export interface ECBlockStatement extends Node, HasSpan {
  type: "ECBlockStatement";
  statements: ECNode[];
}

export interface ECWhileStatement extends Node, HasSpan {
  type: "ECWhileStatement";
  test: ECExp;
  body: ECNode;
}

export interface ECIfStatement extends Node, HasSpan {
  type: "ECIfStatement";
  test: ECExp;
  consequent: ECNode;
  alternate?: ECNode;
}

export interface ECReturnStatement extends Node, HasSpan {
  type: "ECReturnStatement";
  argument?: ECExp;
}

export interface ECLabeledStatement extends Node, HasSpan {
  type: "ECLabeledStatement";
  label: Identifier;
  body: ECNode;
}

export interface ECImportDeclaration extends Node, HasSpan {
  type: "ECImportDeclaration";
  specifiers: ImportSpecifier[];
  source: StringLiteral;
  typeOnly: boolean;
  asserts?: ECObjectExpression;
}

export interface ECVariableDeclaration extends Node, HasSpan {
  type: "ECVariableDeclaration";
  kind: ECVariableDeclarationKind;
  declare: boolean;
  declarations: ECVariableDeclarator[];
}

export type ECVariableDeclarationKind = "let" | "const";

export interface ECVariableDeclarator extends Node, HasSpan {
  type: "ECVariableDeclarator";
  id: ECPattern;
  init?: ECExp;
  definite: boolean;
}

export interface ECForStatement extends Node, HasSpan {
  type: "ECForStatement";
  init?: ECVariableDeclaration | ECExp;
  test?: ECExp;
  update?: ECExp;
  body: ECNode;
}

export interface ECSwitchStatement extends Node, HasSpan {
  type: "ECSwitchStatement";
  discriminant: ECExp;
  cases: ECSwitchCase[];
}

export interface ECSwitchCase extends Node, HasSpan {
  type: "ECSwitchCase";
  /**
   * Undefined for default case
   */
  test?: ECExp;
  consequent: ECNode[];
}

export interface ECTryStatement extends Node, HasSpan {
  type: "ECTryStatement";
  block: ECBlockStatement;
  handler?: ECCatchClause;
  finalizer?: ECBlockStatement;
}

export interface ECCatchClause extends Node, HasSpan {
  type: "ECCatchClause";
  /**
   * The param is `undefined` if the catch binding is omitted. E.g., `try { foo() } catch {}`
   */
  param?: ECPattern;
  body: ECBlockStatement;
}

export type ECExp =
  | NullLiteral
  | BooleanLiteral
  | NumericLiteral
  | BigIntLiteral
  | ECStringLiteral
  | ECTypeDeclaration
  | ECTypeMethodCall
  | ECVariantMethodCall
  | ECJSCall
  | ECIdentifier
  | ECArrayExpression
  | ECArrowFunctionExpression
  | ECAssignmentExpression
  | ECAwaitExpression
  | ECBinaryExpression
  | ECCallExpression
  | ECConditionalExpression
  | ECMemberExpression
  | ECObjectExpression
  | ECSequenceExpression
  | ECTaggedTemplateExpression
  | ECTemplateLiteral
  | ECUnaryExpression;

// Used to distinguish from swc Identifiers, which are sometimes used in situations where they do not have a type.
export interface ECIdentifier extends Node, HasSpan {
  type: "ECIdentifier";
  value: string;
  optional: boolean;
}

// Nodes that only appear after type-checking (wrapped in Typed<>).

// Represents a type declaration (e.g. struct({})).
export interface ECTypeDeclaration extends Node, HasSpan {
  type: "ECTypeDeclaration";
  targetType: Type["baseType"];
  shape: ECExp[];
}

// Represents a call to a type method (e.g. MyStruct.from).
// TODO rename to ECTypeMethodCall
export interface ECTypeMethodCall extends Node, HasSpan {
  type: "ECTypeMethodCall";
  targetType: Type["baseType"];
  method: string; // TODO type this more tightly?
  arguments: ECExp[];
}

// Represents a call to a variant method.
export interface ECVariantMethodCall extends Node, HasSpan {
  type: "ECVariantMethod";
  variant: ECExp; // The variant this method is being called on.
  method: string; // TODO type this more tightly?
  arguments: ECExp[];
}

// Represents a call to the special js() function.
export interface ECJSCall extends Node, HasSpan {
  type: "ECJSCall";
  fn: ECArrowFunctionExpression;
}

// Ectype versions of SWC expression nodes.

export interface ECStringLiteral extends Node, HasSpan {
  type: "ECStringLiteral";
  value: string;
  raw?: string;
}

export interface ECArrayExpression extends Node {
  type: "ECArrayExpression";
  elements: (ECExprOrSpread | undefined)[];
}
export interface ECExprOrSpread {
  spread?: Span;
  expression: ECExp;
}

export interface ECArrowFunctionExpression extends Node, HasSpan {
  type: "ECArrowFunctionExpression";
  params: ECPattern[];
  body: ECBlockStatement | ECExp;
  async: boolean;
}

export interface ECAssignmentExpression extends Node, HasSpan {
  type: "ECAssignmentExpression";
  operator: AssignmentOperator;
  left: ECPattern;
  right: ECExp;
}

export interface ECAwaitExpression extends Node, HasSpan {
  type: "ECAwaitExpression";
  argument: ECExp;
}

export type ECBinaryOperator =
  | "==="
  | "!=="
  | "<"
  | "<="
  | ">"
  | ">="
  | "<<"
  | ">>"
  | ">>>"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "|"
  | "^"
  | "&"
  | "||"
  | "&&"
  | "**"
  | "??";

export interface ECBinaryExpression extends Node, HasSpan {
  type: "ECBinaryExpression";
  operator: ECBinaryOperator;
  left: ECExp;
  right: ECExp;
}

export interface ECCallExpression extends Node, HasSpan {
  type: "ECCallExpression";
  callee: Import | ECExp;
  arguments: ECArgument[];
}

export interface ECArgument {
  spread?: Span;
  expression: ECExp;
}

export interface ECConditionalExpression extends Node, HasSpan {
  type: "ECConditionalExpression";
  test: ECExp;
  consequent: ECExp;
  alternate: ECExp;
}

export interface ECMemberExpression extends Node, HasSpan {
  type: "ECMemberExpression";
  object: ECExp;
  property: Identifier | ECComputedPropName;
}

export interface ECComputedPropName extends Node, HasSpan {
  type: "ECComputed";
  expression: ECExp;
}

export interface ECObjectExpression extends Node, HasSpan {
  type: "ECObjectExpression";
  properties: (ECSpreadElement | ECProperty)[];
}

export interface ECSpreadElement extends Node {
  type: "ECSpreadElement";
  spread: Span;
  arguments: ECExp;
}

export type ECProperty = Identifier | ECKeyValueProperty | ECAssignmentProperty;

export interface ECKeyValueProperty extends Node {
  type: "ECKeyValueProperty";
  key: ECPropertyName;
  value: ECExp;
}

export interface ECAssignmentProperty extends Node {
  type: "ECAssignmentProperty";
  key: Identifier;
  value: ECExp;
}

export type ECPropertyName =
  | Identifier
  | StringLiteral
  | NumericLiteral
  | ECComputedPropName
  | BigIntLiteral;

export interface ECSequenceExpression extends Node, HasSpan {
  type: "ECSequenceExpression";
  expressions: ECExp[];
}

export interface ECTaggedTemplateExpression extends Node, HasSpan {
  type: "ECTaggedTemplateExpression";
  tag: ECExp;
  template: ECTemplateLiteral;
}

export interface ECTemplateLiteral extends Node, HasSpan {
  type: "ECTemplateLiteral";
  expressions: ECExp[];
  quasis: TemplateElement[];
}

export type ECUnaryOperator = "-" | "+" | "!" | "~";

export interface ECUnaryExpression extends Node, HasSpan {
  type: "ECUnaryExpression";
  operator: ECUnaryOperator;
  argument: ECExp;
}
