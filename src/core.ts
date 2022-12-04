type Optional<T> = { Some: T } | { None: null };

interface Type<T> {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Optional<T>;
  valid: (val: unknown) => boolean;
  [others: string]: unknown;
}

const Null: Type<null> = {
  from: (val) => val,
  conform: (val) => (val === null ? { None: null } : { Some: null }),
  valid: (val) => val === null,
};

const Num: Type<number> = {
  from: (val) => val,
  conform: (val) => (typeof val === "number" ? { Some: val } : { None: null }),
  valid: (val) => typeof val === "number",
};

const variant = (options: Record<string, Type<unknown>>): Type<unknown> => {
  const valid = (val: unknown) => {
    if (typeof val !== "object" || val === null) {
      return false;
    }

    const valKeys = Object.keys(val);

    if (valKeys.length !== 1) {
      return false;
    }

    const key = valKeys[0];

    return options[key].valid(val[key]);
  };

  return {
    from: (val) => val,
    conform: (val) => (valid(val) ? { Some: val } : { None: null }),
    valid,
    match: () => {},
  };
};

const Str = {};

// make a schema for a struct
const struct = (shape: Record<string, Type<unknown>>): Type<unknown> => {
  const valid = (val: unknown) => {
    if (typeof val !== "object" || val === null) {
      return false;
    }

    console.log(val);

    return Object.keys(shape).every((key) => shape[key].valid(val[key]));
  };

  return {
    from: (val) => val,
    conform: (val) => (valid(val) ? { Some: val } : { None: null }),
    valid,
    has: (field: string) => shape.hasOwnProperty(field),
    field: (field) => shape[field],
    fields: () => Object.entries(shape),
    eq: () => {},
  };
};

export { Null, Num, variant, struct };
