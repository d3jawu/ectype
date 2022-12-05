type Option<T> = { Some: T } | { None: null };

export interface Type<T> {
  from: (val: unknown) => typeof val;
  conform: (val: unknown) => Option<T>;
  valid: (val: unknown) => boolean;
  [others: string]: unknown;
}

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

// make a schema for a struct
const struct = (shape: Record<string, Type<unknown>>): Type<unknown> => {
  const valid = (val: unknown) => {
    if (typeof val !== "object" || val === null) {
      return false;
    }

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

export { variant, struct };
