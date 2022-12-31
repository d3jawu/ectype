import type {
  Node,
  HasSpan,
  Span,
  BindingIdentifier,
  StringLiteral,
  NumericLiteral,
  BigIntLiteral,
  Invalid,
  KeyValuePatternProperty,
  Identifier,
} from "@swc/core";

import type { KExp } from "./KytheraNode";

export type KPattern =
  | BindingIdentifier
  | KArrayPattern
  | KRestElement
  | KObjectPattern
  | KAssignmentPattern
  | KExp;

export interface KArrayPattern extends Node, HasSpan {
  type: "KArrayPattern";
  elements: (KPattern | undefined)[];
  optional: boolean;
}

export interface KRestElement extends Node, HasSpan {
  type: "KRestElement";
  rest: Span;
  argument: KPattern;
}

export interface KObjectPattern extends Node, HasSpan {
  type: "KObjectPattern";
  properties: KObjectPatternProperty[];
  optional: boolean;
}

export type KObjectPatternProperty =
  | KKeyValuePatternProperty
  | KAssignmentPatternProperty
  | KRestElement;

export interface KKeyValuePatternProperty extends Node {
  type: "KKeyValuePatternProperty";
  key: KPropertyName;
  value: KPattern;
}

export type KPropertyName =
  | Identifier
  | StringLiteral
  | NumericLiteral
  | KComputedPropName
  | BigIntLiteral;

export interface KComputedPropName extends Node, HasSpan {
  type: "KComputed";
  expression: KExp;
}

export interface KAssignmentPatternProperty extends Node, HasSpan {
  type: "KAssignmentPatternProperty";
  key: Identifier;
  value?: KExp;
}

export interface KAssignmentPattern extends Node, HasSpan {
  type: "KAssignmentPattern";
  left: KPattern;
  right: KExp;
}
