const invalid = {};

const Num = {
  from: (val) => val,
  conform: (val) => typeof val === "number" && val,
};

const typeOf = () => {};

const variant = (options) => {
  return {
    from: (val) => val,
    conform: (val) => {
      const valKeys = Object.keys(val);

      valKeys.length === 1 && typeOf(val[valKeys[0]]) === options[valKeys[0]];
    },
  };
};

const String = {};

// make a schema for a struct
const struct = (shape) => {
  return {
    from: (val) => val,
    conform: () => {},
    has: (field) => shape.hasOwnProperty(field),
    field: (field) => shape[field],
    fields: () => Object.entries(shape),
  };
};
