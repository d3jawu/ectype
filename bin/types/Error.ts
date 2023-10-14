import { Span } from "@swc/core";

export type Error = {
  span: Span;
  code: ErrorCode;
  message: string;
};

type ErrorCode = "";

export type Warning = {
  span: Span;
  code: WarningCode;
  message: string;
};

type WarningCode = "";
