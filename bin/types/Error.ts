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
  UNIMPLEMENTED: {
    features: string; // plural
  };
  FORBIDDEN: {
    behavior: string;
  };
  UNDEFINED_VARIABLE: {
    name: string;
  };
  NOT_ALLOWED_HERE: {
    syntax: "computed field" | "spread element" | "destructuring pattern";
  };
  MISSING_EXPECTED: {
    syntax: string;
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
  CONTAINED_TYPE_MISMATCH: {
    contained: Type;
    received: Type;
  };
  EXPECTED_RETURN_TYPE_MISMATCH: {
    received: Type;
    expected: Type;
  };
  INFERRED_RETURN_TYPE_MISMATCH: {
    received: Type;
    seen: Type;
  };
  HANDLER_RETURN_TYPE_MISMATCH: {
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
  NOT_A_FUNCTION: {
    received: Type;
  };
  NOT_A_TYPE: {
    received: Type;
  };
  MATCH_HANDLER_MISSING: {
    missing: string;
  };
  ASYNC_MISMATCH: {
    expected: "async" | "synchronous";
  };
  INVALID_FIELD: {
    type: Type;
    field: string;
  };
  INVALID_TYPE_METHOD: {
    method: string;
    baseType: Type["baseType"];
  };
  VARIANT_TAG_NAME: {
    received: string;
  };
  INVALID_JS: {};
};

export const errorTemplates: Record<keyof ErrorMeta, string> = {
  UNIMPLEMENTED: "$features are not yet supported",
  FORBIDDEN: "$behavior is forbidden", // Avoid FORBIDDEN in favor of a more specific message where possible.
  UNDEFINED_VARIABLE: "$name is not defined.",
  NOT_ALLOWED_HERE: "a $syntax is not allowed here",
  MISSING_EXPECTED: "expected $syntax here",
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
  CONTAINED_TYPE_MISMATCH: "element must be $contained but got $received",
  EXPECTED_RETURN_TYPE_MISMATCH:
    "expected function to return $expected but got $received",
  INFERRED_RETURN_TYPE_MISMATCH:
    "function cannot return $received when it previously also returned $seen",
  HANDLER_RETURN_TYPE_MISMATCH:
    "match handler cannot return $received when another handler also returned $seen",
  BINARY_TYPE_MISMATCH:
    "left-hand side type $left does not match right-hand side type $right",
  TERNARY_TYPE_MISMATCH:
    '"true" expression type $consequent does not match "false" expression type $alternate',
  OPERATOR_TYPE_MISMATCH: '"$operator" cannot be used with $type',
  FROM_TYPE_MISMATCH: "from() expected $expected but got $received",
  NOT_A_FUNCTION: "callee is not a function (got $received)",
  NOT_A_TYPE: "expected a type value but got $received",
  MATCH_HANDLER_MISSING:
    "match() handlers are not exhaustive: missing $missing)",
  ASYNC_MISMATCH: "expected $expected function here",
  INVALID_FIELD: "field $field is not valid on $type",
  INVALID_TYPE_METHOD: "$method is not a valid $baseType method",
  VARIANT_TAG_NAME: "variant tag $received is invalid",
  INVALID_JS: "call to js() is invalid",
};
