import type {
  NullLiteral,
  BooleanLiteral,
  NumericLiteral,
  BigIntLiteral,
  StringLiteral,
  TemplateLiteral,
  DebuggerStatement,
  EmptyStatement,
} from "@swc/core";

export type KytheraNode =
  // literals
  | NullLiteral
  | BooleanLiteral
  | NumericLiteral
  | BigIntLiteral
  | StringLiteral
  | TemplateLiteral
  // statements
  | DebuggerStatement
  | EmptyStatement;
