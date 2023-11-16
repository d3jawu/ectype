import type { ECExp } from "../../types/ECNode.js";
import type { ECPattern } from "../../types/ECPattern.js";

// This function serves to provide type guarantees that an expression-or-pattern
// is just an expression.
// If node is a Pattern node, it returns null.
// If not, it returns the ECExp (with type guarantees).
const disallowPattern = (node: ECExp | ECPattern): ECExp | null => {
  if (
    node.type === "ECArrayPattern" ||
    node.type === "ECObjectPattern" ||
    node.type === "ECAssignmentPattern" ||
    node.type === "ECRestElement"
  ) {
    return null;
  }

  return node;
};

export { disallowPattern };
