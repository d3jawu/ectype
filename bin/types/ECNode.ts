import type {
  AssignmentOperator,
  BreakStatement,
  ContinueStatement,
  DebuggerStatement,
  EmptyStatement,
  Identifier,
  LogicalOperator,
  Node,
  TemplateElement,
} from "acorn";

import type { Type } from "../../core/core";
import type { ECPattern } from "./ECPattern";

export type ECNode = ECExp | ECStatement;

export type ECStatement =
  | DebuggerStatement
  | EmptyStatement
  | BreakStatement
  | ContinueStatement
  | ECExportNamedDeclaration
  | ECImportDeclaration
  | ECBlockStatement
  | ECVariableDeclaration
  | ECForStatement
  | ECSwitchStatement
  | ECWhileStatement
  | ECTryStatement
  | ECIfStatement
  | ECReturnStatement
  | ECLabeledStatement;

export interface ECExportNamedDeclaration extends Node {
  type: "ECExportNamedDeclaration";
  specifiers: Array<ECExportSpecifier>;
}

export interface ECExportSpecifier extends Node {
  type: "ECExportSpecifier";
  exported: string;
  local: string;
}

export interface ECBlockStatement extends Node {
  type: "ECBlockStatement";
  body: ECNode[];
}

export interface ECWhileStatement extends Node {
  type: "ECWhileStatement";
  test: ECExp;
  body: ECNode;
}

export interface ECIfStatement extends Node {
  type: "ECIfStatement";
  test: ECExp;
  consequent: ECNode;
  alternate?: ECNode;
}

export interface ECReturnStatement extends Node {
  type: "ECReturnStatement";
  argument?: ECExp;
}

export interface ECLabeledStatement extends Node {
  type: "ECLabeledStatement";
  label: Identifier;
  body: ECNode;
}

export interface ECImportDeclaration extends Node {
  type: "ECImportDeclaration";
  specifiers: ECImportSpecifier[];
  source: string;
}

export interface ECImportSpecifier extends Node {
  type: "ECImportSpecifier";
  imported: string;
  local: string;
}

export interface ECVariableDeclaration extends Node {
  type: "ECVariableDeclaration";
  kind: "let" | "const";
  declarations: ECVariableDeclarator[];
}

export interface ECVariableDeclarator extends Node {
  type: "ECVariableDeclarator";
  id: ECPattern;
  init?: ECExp;
}

export interface ECForStatement extends Node {
  type: "ECForStatement";
  init?: ECVariableDeclaration | ECExp;
  test?: ECExp;
  update?: ECExp;
  body: ECNode;
}

export interface ECSwitchStatement extends Node {
  type: "ECSwitchStatement";
  discriminant: ECExp;
  cases: ECSwitchCase[];
}

export interface ECSwitchCase extends Node {
  type: "ECSwitchCase";
  /**
   * Undefined for default case
   */
  test?: ECExp;
  consequent: ECNode[];
}

export interface ECTryStatement extends Node {
  type: "ECTryStatement";
  block: ECBlockStatement;
  handler?: ECCatchClause;
  finalizer?: ECBlockStatement;
}

export interface ECCatchClause extends Node {
  type: "ECCatchClause";
  // param is `undefined` if the catch binding is omitted. E.g., `try { foo() } catch {}`
  param?: ECPattern;
  body: ECBlockStatement;
}

export type ECExp =
  | ECNullLiteral
  | ECBooleanLiteral
  | ECNumberLiteral
  | ECStringLiteral
  | ECBigIntLiteral
  | ECRegexp
  | ECTypeDeclaration
  | ECTypeMethodCall
  | ECJSCall
  | ECIdentifier
  | ECArrayExpression
  | ECArrowFunctionExpression
  | ECAssignmentExpression
  | ECAwaitExpression
  | ECBinaryExpression
  | ECCallExpression
  | ECConditionalExpression
  | ECImportExpression
  | ECLogicalExpression
  | ECMemberExpression
  | ECObjectExpression
  | ECSequenceExpression
  | ECTaggedTemplateExpression
  | ECTemplateLiteral
  | ECUnaryExpression;

export interface ECIdentifier extends Node {
  type: "ECIdentifier";
  name: string;
}

// Nodes that only appear after type-checking (wrapped in Typed<>).

// Represents a type declaration (e.g. struct({})).
export interface ECTypeDeclaration extends Node {
  type: "ECTypeDeclaration";
  targetType: Type["baseType"];
}

// Represents a call to a type method (e.g. MyStruct.from).
// TODO rename to ECTypeMethodCall
export interface ECTypeMethodCall extends Node {
  type: "ECTypeMethodCall";
  targetType: Type["baseType"];
  method: string; // TODO type this more tightly?
  arguments: ECExp[];
}

// Represents a call to the special js() function.
export interface ECJSCall extends Node {
  type: "ECJSCall";
  fn: ECArrowFunctionExpression;
}

// Ectype versions of expression nodes.
export interface ECNullLiteral extends Node {
  type: "ECNullLiteral";
}

export interface ECBooleanLiteral extends Node {
  type: "ECBooleanLiteral";
  value: boolean;
}

export interface ECNumberLiteral extends Node {
  type: "ECNumberLiteral";
  value: number;
}

export interface ECBigIntLiteral extends Node {
  type: "ECBigIntLiteral";
  value: bigint;
}

export interface ECStringLiteral extends Node {
  type: "ECStringLiteral";
  value: string;
}

export interface ECRegexp extends Node {
  type: "ECRegexp";
  pattern: string;
  flags: string;
}

export interface ECSpreadElement extends Node {
  type: "ECSpreadElement";
  argument: ECExp;
}

export interface ECArrayExpression extends Node {
  type: "ECArrayExpression";
  elements: (ECExp | ECSpreadElement | null)[];
}

export interface ECArrowFunctionExpression extends Node {
  type: "ECArrowFunctionExpression";
  params: ECPattern[];
  body: ECBlockStatement | ECExp;
  async: boolean;
}

export interface ECAssignmentExpression extends Node {
  type: "ECAssignmentExpression";
  operator: AssignmentOperator;
  left: ECPattern;
  right: ECExp;
}

export interface ECAwaitExpression extends Node {
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
  | "**";

export interface ECBinaryExpression extends Node {
  type: "ECBinaryExpression";
  operator: ECBinaryOperator;
  left: ECExp;
  right: ECExp;
}

export interface ECLogicalExpression extends Node {
  type: "ECLogicalExpression";
  operator: LogicalOperator;
  left: ECExp;
  right: ECExp;
}

export interface ECCallExpression extends Node {
  type: "ECCallExpression";
  callee: ECExp;
  arguments: (ECExp | ECSpreadElement)[];
}

export interface ECConditionalExpression extends Node {
  type: "ECConditionalExpression";
  test: ECExp;
  consequent: ECExp;
  alternate: ECExp;
}

export interface ECImportExpression extends Node {
  type: "ECImportExpression";
  source: ECExp;
}

export interface ECMemberExpression extends Node {
  type: "ECMemberExpression";
  object: ECExp;
  property: ECExp | string; // string if not computed
}

export interface ECObjectExpression extends Node {
  type: "ECObjectExpression";
  properties: (ECSpreadElement | ECProperty)[];
}

export interface ECProperty extends Node {
  type: "ECProperty";
  key: ECExp;
  value: ECExp | ECPattern;
  method: boolean;
  shorthand: boolean;
  computed: boolean;
}

export interface ECSequenceExpression extends Node {
  type: "ECSequenceExpression";
  expressions: ECExp[];
}

export interface ECTaggedTemplateExpression extends Node {
  type: "ECTaggedTemplateExpression";
  tag: ECExp;
  quasi: ECTemplateLiteral;
}

export interface ECTemplateLiteral extends Node {
  type: "ECTemplateLiteral";
  expressions: ECExp[];
  quasis: TemplateElement[];
}

export type ECUnaryOperator = "-" | "+" | "!" | "~";

export interface ECUnaryExpression extends Node {
  type: "ECUnaryExpression";
  operator: ECUnaryOperator;
  argument: ECExp;
}
