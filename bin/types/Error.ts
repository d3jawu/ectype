import { Span } from "@swc/core";

export type Error = {
  span: Span;
  code: ErrorCode;
  message: string;
};

type ErrorCode =
  | "UNDEFINED_VARIABLE"
  | "TYPE_MISMATCH"
  | "INVALID_OPERATION"
  | "INVALID_SYNTAX";

export type ResolvedError = {
  code: ErrorCode;
  message: string;
  path: string;
  line: number;
  col: number;
};

export type Warning = {
  span: Span;
  code: WarningCode;
  message: string;
};

type WarningCode = "";

export type ResolvedWarning = {
  code: WarningCode;
  message: string;
  path: string;
  line: number;
  col: number;
};
