import { LogicalOperator, SourceLocation } from "acorn";
import { Type } from "../../core/internal.js";
import type { ECBinaryOperator } from "./ECNode.js";

export type ErrorSpan = {
  code: keyof ErrorMeta;
  meta: ErrorMeta[keyof ErrorMeta];
  remark?: string;
  start: number;
  end: number;
  loc?: SourceLocation;
};

export type ErrorMeta = {
  UNDEFINED_VARIABLE: {
    name: string;
  };
  UNIMPLEMENTED: {
    features: string; // plural
  };
  FORBIDDEN: {
    behavior: string;
  };
  NOT_ALLOWED_HERE: {
    syntax: "computed field" | "spread element" | "destructuring pattern";
  };
  CONDITION_TYPE_MISMATCH: {
    structure:
      | "if-statement"
      | "while-loop"
      | "for-loop"
      | "ternary expression"
      | "cond predicate";
    received: Type;
  };
  ASSIGNMENT_TYPE_MISMATCH: {
    received: Type;
    expected: Type;
    varName: string;
  };
  ARG_TYPE_MISMATCH: {
    n: number;
    received: Type;
    expected: Type;
  };
  ARG_COUNT_MISMATCH: {
    received: number;
    expected: number;
  };
  KEY_TYPE_MISMATCH: {
    key: string;
    received: Type;
    expected: Type;
  };
  INDEX_TYPE_MISMATCH: {
    received: Type;
    expected: Type;
  };
  RETURN_TYPE_MISMATCH: {
    received: Type;
    seen: Type;
  };
  BINARY_TYPE_MISMATCH: {
    left: Type;
    right: Type;
  };
  TERNARY_TYPE_MISMATCH: {
    consequent: Type;
    alternate: Type;
  };
  OPERATOR_TYPE_MISMATCH: {
    operator: ECBinaryOperator | LogicalOperator;
    type: Type;
  };
  FROM_TYPE_MISMATCH: {
    received: Type;
    expected: Type;
  };
  INVALID_TYPE_METHOD: {
    name: string;
    baseType: Type["baseType"];
  };
  VARIANT_TAG_NAME: {
    received: string;
  };
};

export const errorTemplates: Record<keyof ErrorMeta, string> = {
  UNDEFINED_VARIABLE: "$name is not defined.",
  UNIMPLEMENTED: "$features are not yet supported",
  FORBIDDEN: "$behavior is forbidden",
  NOT_ALLOWED_HERE: "a $syntax is not allowed here",
  CONDITION_TYPE_MISMATCH:
    "condition for $structure must be a Bool but got $received",
  ASSIGNMENT_TYPE_MISMATCH:
    "cannot assign $received to variable $varName, which is of type $expected",
  ARG_TYPE_MISMATCH:
    "argument $n of type $received does not match expected type $expected",
  ARG_COUNT_MISMATCH: "expected $expected arguments but got $received",
  KEY_TYPE_MISMATCH: 'expected $expected for "$key" but got $received',
  INDEX_TYPE_MISMATCH:
    "expected index to be of type $expected but got $received",
  RETURN_TYPE_MISMATCH: "expected function to return $seen but got $received",
  BINARY_TYPE_MISMATCH:
    "left-hand side type $left does not match right-hand side type $right",
  TERNARY_TYPE_MISMATCH:
    '"true" expression type $consequent does not match "false" expression type $alternate',
  OPERATOR_TYPE_MISMATCH: '"$operator" cannot be used with $type',
  FROM_TYPE_MISMATCH: "from() expected $expected but got $received",
  INVALID_TYPE_METHOD: "$name is not a valid $baseType method",
  VARIANT_TAG_NAME: "variant tag $received is invalid",
};
