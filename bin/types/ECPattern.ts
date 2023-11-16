import type { Node } from "acorn";
import type {
  ECExp,
  ECIdentifier,
  ECMemberExpression,
  ECProperty,
} from "./ECNode";

export type ECPattern =
  | ECIdentifier
  | ECMemberExpression
  | ECObjectPattern
  | ECArrayPattern
  | ECRestElement
  | ECAssignmentPattern;

export interface ECObjectPattern extends Node {
  type: "ECObjectPattern";
  // This breaks from acorn's AST, which has ECAssignmentProperty here.
  properties: (ECProperty | ECRestElement)[];
}

export interface ECArrayPattern extends Node {
  type: "ECArrayPattern";
  elements: (ECPattern | null)[];
}

export interface ECRestElement extends Node {
  type: "ECRestElement";
  argument: ECPattern;
}

export interface ECAssignmentPattern extends Node {
  type: "ECAssignmentPattern";
  left: ECPattern;
  right: ECExp;
}
