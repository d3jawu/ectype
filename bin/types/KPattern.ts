import type {
  Node,
  HasSpan,
  Span,
  BindingIdentifier,
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
  | Invalid
  | KExp;

export interface KArrayPattern extends Node, HasSpan {
  type: "ArrayPattern";
  elements: (KPattern | undefined)[];
  optional: boolean;
}

export interface KRestElement extends Node, HasSpan {
  type: "RestElement";
  rest: Span;
  argument: KPattern;
}

export interface KObjectPattern extends Node, HasSpan {
  type: "ObjectPattern";
  properties: ObjectPatternProperty[];
  optional: boolean;
}

export type ObjectPatternProperty =
  | KeyValuePatternProperty
  | KAssignmentPatternProperty
  | KRestElement;

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
