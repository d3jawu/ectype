// Not to be conflated with the Type value used at runtime (found in /core).
export type TypeAnnotation =
  // The "deferred" tag is given to values whose types are not knowable at compile-time.
  | {
      ktype: "deferred";
    }
  // The "statement" tag is given to statements (which do not evaluate to a value).
  // The purpose of this tag is to allow all nodes, even statements, to have a type tag.
  | {
      ktype: "statement";
    }
  | {
      ktype: "null";
    }
  | {
      ktype: "bool";
    }
  | {
      ktype: "num";
    }
  | {
      ktype: "str";
    }
  | {
      ktype: "fn";
      from: TypeAnnotation;
      to: TypeAnnotation;
    }
  | {
      ktype: "variant";
      options: Record<string, TypeAnnotation>;
    }
  | {
      ktype: "tuple";
      fields: TypeAnnotation[];
    }
  | {
      ktype: "array";
      contains: TypeAnnotation;
    }
  | {
      ktype: "struct";
      fields: Record<string, TypeAnnotation>;
    }
  | {
      ktype: "type";
      type: TypeAnnotation;
    };

const Deferred: TypeAnnotation = {
  ktype: "deferred",
};
const Statement: TypeAnnotation = {
  ktype: "statement",
};
const Null: TypeAnnotation = {
  ktype: "null",
};
const Bool: TypeAnnotation = {
  ktype: "bool",
};
const Num: TypeAnnotation = {
  ktype: "num",
};
const Str: TypeAnnotation = {
  ktype: "str",
};

export { Deferred, Statement, Null, Bool, Num, Str };
