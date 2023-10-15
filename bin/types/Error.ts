import { Span } from "@swc/core";

export type Error = {
  span: Span;
  code: ErrorCode;
  message: string;
};

type ErrorCode = "UNDEFINED_VARIABLE" | "TYPE_MISMATCH" | "INVALID_OPERATION";

export type Warning = {
  span: Span;
  code: WarningCode;
  message: string;
};

type WarningCode = "";
