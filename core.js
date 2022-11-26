const types = {};
const reifyType = (name) => {
  if (!types[name]) {
    throw new Error(`Type ${name} is not in the registry.`);
  }
};

// create a type in the registry.
const type = (name, structure) => {
  // TODO store types in registry as raw structure or reified map?
  types[name] = structure;

  return {
    _obj: val,
    get: (key) => val[key],
    has: (key) => val.hasOwnProperty(key),
    set: (key, newVal) => (val[key] = newVal),
    keys: () => Object.keys(val),
    values: () => Object.values(val),
    entries: () => Object.entries(val),
  };
};

type("unit", {});
type("bool", {});
type("num", {
  "+": "() => ",
});
type("str", {});

// conform (aka is?), valid, etc.

const point = type("point", {
  x: "num",
  y: "num",
});
