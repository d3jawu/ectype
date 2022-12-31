import type {
  Node,
  HasSpan,
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
  VariableDeclaration,
  Identifier,
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
  | VariableDeclaration
  | KDoWhileStatement
  | KWhileStatement
  | KIfStatement
  | KReturnStatement
  | KLabeledStatement;

export type KExp =
  // literals
  | NullLiteral
  | BooleanLiteral
  | NumericLiteral
  | BigIntLiteral
  | StringLiteral
  | TemplateLiteral
  | Identifier;

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
  type: "VariableDeclarator";
  id: KPattern;
  init?: KExp;
  definite: boolean;
}
