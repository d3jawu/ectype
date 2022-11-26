// incomplete version of object map of type used for bootstrapping
const _objectMapsOfType = [];
const _objectMapOfType = (val) => {
  const m = {
    _obj: val,
    get: (key) => val[key],
    has: (key) => val.hasOwnProperty(key),
    set: (key, newVal) => (val[key] = newVal),
    keys: () => Object.keys(val),
    values: () => Object.values(val),
    entries: () => Object.entries(val),
  };

  _objectMapsOfType.push(m);

  return m;
};

// TODO fill in primitives
const bool = _objectMapOfType({});
const num = _objectMapOfType({});
const str = _objectMapOfType({});
const unit = _objectMapOfType({});

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

const typeRegistry = (() => {
  const byName = {};

  return {
    register: () => {
      byName;
    },
  };
})();

// create a tuple from an array.
const tuple = (arr) =>
  arr.reduce((acc, curr, i) => {
    acc["$" + i] = curr;
    return acc;
  }, {});

const listContainingType = _objectMapOfType({
  get: _objectMapOfType({
    "()": num,
    "=>": type,
  }),
  set: _objectMapOfType({
    "()": _objectMapOfType({
      $0: num,
      $1: type,
    }),
    "=>": type,
  }),
  append: _objectMapOfType({
    "()": type,
    "=>": type,
  }),
  append: _objectMapOfType({
    "()": unit,
    "=>": num,
  }),
});

// create a map backed by an object. keys are always strings.
const objectMap = (T, obj) => {
  // generates the type for a list of T.
  const generateListType = (T) => {
    if (T == type) {
      return listContainingType;
    } else {
      return objectMap(type, {
        get: objectMap(type, {
          "()": num,
          "=>": T,
        }),
        set: objectMap(type, {
          "()": objectMap(type, {
            $0: num,
            $1: T,
          }),
          "=>": T,
        }),
        append: objectMap(type, {
          "()": T,
          "=>": T,
        }),
        append: objectMap(type, {
          "()": unit,
          "=>": num,
        }),
      });
    }
  };

  const listContainingT = generateListType(T);
  const listContainingStr = generateListType(str);
  const listContainingStrT = generateListType(
    objectMap(type, {
      $0: str,
      $1: T,
    })
  );

  return {
    get: typedFn(str, T, (key) => obj[key]),
    has: typedFn(str, bool, (key) => obj.hasOwnProperty(key)),
    set: typedFn(str, T, (key, val) => (obj[key] = val)),
    keys: typedFn(unit, listContainingStr, () => Object.keys(val)),
    values: typedFn(unit, listContainingT, () => Object.values(val)),
    entries: typedFn(unit, listContainingStrT, () => Object.entries(val)),
  };
};

// create a list backed by an array.
const arrayList = (T, arr) => ({
  get: typedFn(num, T, (i) => arr[i]),
  set: typedFn(num, T, (i, val) => (arr[i] = val)),
  append: typedFn(T, T, (val) => (arr.push(val), val)),
  len: typedFn(unit, num, () => arr.length),
});

// complete incomplete object maps
_objectMapsOfType.forEach((om) => {
  const fullMap = objectMap(type, om._obj);
  Object.entries(fullMap).forEach(([key, val]) => {
    om[key] = fullMap[key];
  });
  delete om._obj;
});

// Bootstrapping boundary

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
