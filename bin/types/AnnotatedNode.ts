import type { KNode } from "./KytheraNode";
import type { TypeAnnotation } from "./TypeAnnotation";

export type AnnotatedNode = KNode & {
  atype: TypeAnnotation;
};
