import type {
  Node,
  HasSpan,
  Span,
  NullLiteral,
  BooleanLiteral,
  NumericLiteral,
  BigIntLiteral,
  StringLiteral,
  TemplateLiteral,
  DebuggerStatement,
  EmptyStatement,
  BreakStatement,
  ContinueStatement,
  ExportNamedDeclaration,
  ImportDeclaration,
  Identifier,
  AssignmentOperator,
} from "@swc/core";

import type { KPattern } from "./KPattern";

export type KNode = KExp | KStatement;

export type KStatement =
  | DebuggerStatement
  | EmptyStatement
  | KBlockStatement
  | BreakStatement
  | ContinueStatement
  | ExportNamedDeclaration
  | ImportDeclaration
  | KVariableDeclaration
  | KForStatement
  | KSwitchStatement
  | KDoWhileStatement
  | KWhileStatement
  | KTryStatement
  | KIfStatement
  | KReturnStatement
  | KLabeledStatement;

export interface KBlockStatement extends Node, HasSpan {
  type: "KBlockStatement";
  statements: KNode[];
}

export interface KDoWhileStatement extends Node, HasSpan {
  type: "KDoWhileStatement";
  test: KExp;
  body: KNode;
}

export interface KWhileStatement extends Node, HasSpan {
  type: "KWhileStatement";
  test: KExp;
  body: KNode;
}

export interface KIfStatement extends Node, HasSpan {
  type: "KIfStatement";
  test: KExp;
  consequent: KNode;
  alternate?: KNode;
}

export interface KReturnStatement extends Node, HasSpan {
  type: "KReturnStatement";
  argument?: KExp;
}

export interface KLabeledStatement extends Node, HasSpan {
  type: "KLabeledStatement";
  label: Identifier;
  body: KNode;
}

export interface KVariableDeclaration extends Node, HasSpan {
  type: "KVariableDeclaration";
  kind: KVariableDeclarationKind;
  declare: boolean;
  declarations: KVariableDeclarator[];
}

export type KVariableDeclarationKind = "let" | "const";

export interface KVariableDeclarator extends Node, HasSpan {
  type: "KVariableDeclarator";
  id: KPattern;
  init?: KExp;
  definite: boolean;
}

export interface KForStatement extends Node, HasSpan {
  type: "KForStatement";
  init?: KVariableDeclaration | KExp;
  test?: KExp;
  update?: KExp;
  body: KNode;
}

export interface KSwitchStatement extends Node, HasSpan {
  type: "KSwitchStatement";
  discriminant: KExp;
  cases: KSwitchCase[];
}

export interface KSwitchCase extends Node, HasSpan {
  type: "KSwitchCase";
  /**
   * Undefined for default case
   */
  test?: KExp;
  consequent: KNode[];
}

export interface KTryStatement extends Node, HasSpan {
  type: "KTryStatement";
  block: KBlockStatement;
  handler?: KCatchClause;
  finalizer?: KBlockStatement;
}

export interface KCatchClause extends Node, HasSpan {
  type: "KCatchClause";
  /**
   * The param is `undefined` if the catch binding is omitted. E.g., `try { foo() } catch {}`
   */
  param?: KPattern;
  body: KBlockStatement;
}

export type KExp =
  // literals
  | NullLiteral
  | BooleanLiteral
  | NumericLiteral
  | BigIntLiteral
  | StringLiteral
  | Identifier
  | KArrayExpression
  | KArrowFunctionExpression
  | KAssignmentExpression
  | KAwaitExpression
  | KBinaryExpression
  | KConditionalExpression
  | KMemberExpression
  | KSequenceExpression
  | KUnaryExpression;

export interface KArrayExpression extends Node, HasSpan {
  type: "KArrayExpression";
  elements: (KExprOrSpread | undefined)[];
}
export interface KExprOrSpread {
  spread?: Span;
  expression: KExp;
}

export interface KArrowFunctionExpression extends Node, HasSpan {
  type: "KArrowFunctionExpression";
  params: KPattern[];
  body: KBlockStatement | KExp;
  async: boolean;
}

export interface KAssignmentExpression extends Node, HasSpan {
  type: "KAssignmentExpression";
  operator: AssignmentOperator;
  left: KExp | KPattern;
  right: KExp;
}

export interface KAwaitExpression extends Node, HasSpan {
  type: "KAwaitExpression";
  argument: KExp;
}

export type KBinaryOperator =
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

export interface KBinaryExpression extends Node, HasSpan {
  type: "KBinaryExpression";
  operator: KBinaryOperator;
  left: KExp;
  right: KExp;
}

export interface KConditionalExpression extends Node, HasSpan {
  type: "KConditionalExpression";
  test: KExp;
  consequent: KExp;
  alternate: KExp;
}

export interface KMemberExpression extends Node, HasSpan {
  type: "KMemberExpression";
  object: KExp;
  property: Identifier | KComputedPropName;
}

export interface KComputedPropName extends Node, HasSpan {
  type: "KComputed";
  expression: KExp;
}

export interface KSequenceExpression extends Node, HasSpan {
  type: "KSequenceExpression";
  expressions: KExp[];
}

export type KUnaryOperator = "-" | "+" | "!" | "~";

export interface KUnaryExpression extends Node, HasSpan {
  type: "KUnaryExpression";
  operator: KUnaryOperator;
  argument: KExp;
}
