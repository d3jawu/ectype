import { SourceLocation } from "acorn";

export type Error = {
  code: ErrorCode;
  message: string;
  start: number;
  end: number;
  loc?: SourceLocation;
};

type ErrorCode =
  | "UNDEFINED_VARIABLE"
  | "TYPE_MISMATCH"
  | "INVALID_OPERATION"
  | "INVALID_SYNTAX"
  | "UNIMPLEMENTED";

export type Warning = {
  code: WarningCode;
  message: string;
  start: number;
  end: number;
  loc?: SourceLocation;
};

type WarningCode = "";
