// incomplete version of object map of type used for bootstrapping
const _objectMapsOfType = [];
const _objectMapOfType = (val) => {
  const m = {
    _obj: val,
    get: (key) => val[key],
    has: (key) => val.hasOwnProperty(key),
    set: (key, newVal) => (val[key] = newVal),
    // TODO
    // keys: () => Object.keys(val),
    // values: () => Object.values(val),
    // entries: () => Object.entries(val),
  };

  _objectMapsOfType.push(m);

  return m;
};

// TODO fill in primitives
const bool = _objectMapOfType({});
const num = _objectMapOfType({});
const str = _objectMapOfType({});

// mark a function with its parameter and return types
// TODO check param and return type specs as well
const typedFn = (param, returns, fn) =>
  Object.defineProperties(fn, {
    "()": { value: param },
    "=>": { value: returns },
  });

const conform = () => {};

const type = {};
const _type = _objectMapOfType({
  get: _objectMapOfType({
    "()": str,
    "=>": type,
  }),
  has: _objectMapOfType({
    "()": str,
    "=>": bool,
  }),
  set: _objectMapOfType({
    "()": str,
    "=>": type,
  }),
});
type.get = _type.get;
type.has = _type.has;
type.set = _type.set;

const objectMap = (T, val) => ({
  get: typedFn(str, T, (key) => val[key]),
  has: typedFn(str, bool, (key) => val.hasOwnProperty(key)),
  set: typedFn(str, T, (key, newVal) => (val[key] = newVal)),
  // TODO
  // keys: () => Object.keys(val),
  // values: () => Object.values(val),
  // entries: () => Object.entries(val),
});

// complete incomplete object maps
_objectMapsOfType.forEach((om) => {
  const val = om._obj;
  om.get = typedFn(str, type, (key) => val[key]);
  om.has = typedFn(str, bool, (key) => val.hasOwnProperty(key));
  om.set = typedFn(str, type, (key, newVal) => (val[key] = newVal));
  delete om._obj;
});

const typeOf = (val) =>
  ({
    number: () => num,
    boolean: () => bool,
    string: () => str,
    object: () => {
      const typeMap = Object.entries(val).reduce((acc, [key, val]) => {
        acc[key] = typeOf(val);
        return acc;
      }, {});

      return objectMap(type, typeMap);
    },
    function: () => {
      return objectMap(type, { "()": val["()"], "=>": val["=>"] });
    },
  }[typeof val]());

console.log(typeOf(type));
