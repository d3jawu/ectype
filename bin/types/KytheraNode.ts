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
} from "@swc/core";
import { VariableDeclaration } from "typescript";

export type KNode = KExp | KStatement;

export type KStatement =
  | DebuggerStatement
  | EmptyStatement
  | KBlockStatement
  | BreakStatement
  | ContinueStatement
  | ExportNamedDeclaration
  | VariableDeclaration
  | KDoWhileStatement
  | KWhileStatement
  | KForStatement;

export type KExp =
  // literals
  | NullLiteral
  | BooleanLiteral
  | NumericLiteral
  | BigIntLiteral
  | StringLiteral
  | TemplateLiteral;

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
