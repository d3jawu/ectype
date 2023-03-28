import type {
  Node,
  HasSpan,
  Span,
  BindingIdentifier,
  StringLiteral,
  NumericLiteral,
  BigIntLiteral,
  Identifier,
} from "@swc/core";

import type { ECExp } from "./ECNode";

export type ECPattern =
  | BindingIdentifier
  | ECArrayPattern
  | ECRestElement
  | ECObjectPattern
  | ECAssignmentPattern
  | ECExp;

export interface ECArrayPattern extends Node, HasSpan {
  type: "ECArrayPattern";
  elements: (ECPattern | undefined)[];
  optional: boolean;
}

export interface ECRestElement extends Node, HasSpan {
  type: "ECRestElement";
  rest: Span;
  argument: ECPattern;
}

export interface ECObjectPattern extends Node, HasSpan {
  type: "ECObjectPattern";
  properties: ECObjectPatternProperty[];
  optional: boolean;
}

export type ECObjectPatternProperty =
  | ECKeyValuePatternProperty
  | ECAssignmentPatternProperty
  | ECRestElement;

export interface ECKeyValuePatternProperty extends Node {
  type: "ECKeyValuePatternProperty";
  key: ECPropertyName;
  value: ECPattern;
}

export type ECPropertyName =
  | Identifier
  | StringLiteral
  | NumericLiteral
  | ECComputedPropName
  | BigIntLiteral;

export interface ECComputedPropName extends Node, HasSpan {
  type: "ECComputed";
  expression: ECExp;
}

export interface ECAssignmentPatternProperty extends Node, HasSpan {
  type: "ECAssignmentPatternProperty";
  key: Identifier;
  value?: ECExp;
}

export interface ECAssignmentPattern extends Node, HasSpan {
  type: "ECAssignmentPattern";
  left: ECPattern;
  right: ECExp;
}
