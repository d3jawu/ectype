import { strict as assert } from "node:assert";

import { Type, ObjectMap, Any } from "./core.js";

// confirm that all fields have been filled out
[
  Type,
  // ObjectMap,
  // Fn,
].forEach((v, i) => {
  Object.entries(v).forEach(([key, val]) =>
    assert.ok(
      typeof val !== "undefined",
      `key ${key} on object ${i} was not set.`
    )
  );
});

console.log(Type);

const testCircular = (template, actual) => {
  const refs = {};

  // collect refs
  Object.entries(template).forEach(([key, val]) => {
    if (typeof key === "string" && key[0] === "$") {
      refs[key] = actual[key];
    } else {
      throw new Error(`Expected string key to start with '$' but got ${key}`);
    }
  });

  const testObject = (t, a) => {
    Object.entries(t).forEach(([key, templateVal]) => {
      ({
        object: () => {
          testObject(t[key], a[key]);
        },
        string: () => {
          if (templateVal[0] === "$") {
            // test reference equality
            assert.ok(
              a[key] === refs[templateVal],
              `Got ${a[templateVal]}, expected reference ${templateVal} for key ${key}`
            );
          } else {
            throw new Error("Can't test for string equality yet.");
          }
        },
      }[typeof templateVal]());
    });
  };

  Object.entries(actual).forEach(([key, actualVal]) => {
    testObject(template[key], actualVal);
  });
};

// the shape of an object map of types
const objectMapOfTypeInstanceShape = {
  contains: "$Type",
};

testCircular(
  {
    $Type: {
      __type__: "$Type",
      fields: objectMapOfTypeInstanceShape,
    },
    $Any: {
      __type__: "$Type",
    },
  },
  {
    $Type: Type,
    // $ObjectMap: ObjectMap,
    // $Fn: Fn,
    $Any: Any,
  }
);
