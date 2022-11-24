// mark a function with its parameter and return types
const typedFn = (param, returns, fn) =>
  Object.defineProperties(fn, {
    "()": {
      value: param,
      enumerable: true,
    },
    "=>": {
      value: returns,
      enumerable: true,
    },
  });

const typeOf = (val) =>
  ({
    number: () => num,
    boolean: () => bool,
    string: () => str,
    object: () => {
      const typeMap = Object.entries(val).reduce((acc, [key, val]) => {
        acc[key] = typeOf(val);
      }, {});

      return objectMap(typeMap);
    },
  }[typeof val]());

// given a type, generates a predicate that checks that type against a value
const specFromType = (type) => (val) => {
  const valType = typeOf(val);
};

// incomplete version of object map used for bootstrapping
const incompleteObjectMaps = [];
const incompleteObjectMap = (T, val) => {
  const m = {
    _obj: val,
    get: (key) => {
      // key = Str(key);
      return val[key];
    },
    has: (key) => {
      // key = Str(key);
      return val.hasOwnProperty(key);
    },
    set: (key, newVal) => {
      // key = Str(key);
      // newVal = T(newVal)
      return (val[key] = newVal);
    },
    keys: () => Object.keys(val),
    values: () => Object.values(val),
    entries: () => Object.entries(val),
  };
  incompleteObjectMaps.push(m);

  return m;
};

const _fnType = (param, returns) =>
  incompleteObjectMap({
    "()": param,
    "=>": returns,
  });

// TODO fill in primitives
const bool = incompleteObjectMap({});
const num = incompleteObjectMap({});
const str = incompleteObjectMap({});

const objectMap = (T, val) => ({
  get: typedFn(str, T, (key) => {
    // key = Str(key);
    return val[key];
  }),
  has: (key) => {
    // key = Str(key);
    return val.hasOwnProperty(key);
  },
  set: (key, newVal) => {
    // key = Str(key);
    // newVal = T(newVal)
    return (val[key] = newVal);
  },
  keys: () => Object.keys(val),
  values: () => Object.values(val),
  entries: () => Object.entries(val),
});

const Str = specFromType(str);
