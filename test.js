import { strict as assert } from "node:assert";

import { Type, ObjectMap, Fn } from "./core.js";

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
    // analyze actual objects
    Object.entries(t).forEach(([key, templateVal]) => {
      templateVal(
        {
          object: () => {
            testObject(t[key], a[key]);
          },
          string: () => {
            if (templateVal[0] === "$") {
              console.log(`Testing key ${key}`);
              // test reference
              assert.ok(
                a[templateVal] === refs[templateVal],
                `Got ${a[templateVal]}, expected ${refs[templateVal]}`
              );
            } else {
              throw new Error("Can't test for raw string values yet.");
            }
          },
        }[typeof templateVal]()
      );
    });
  };

  // test with each entry in `actual` as its own root
  Object.entries(actual).forEach(([key, actualVal]) => {
    console.log(`Testing ${key}`);
    console.log(template[key]);
    console.log(actualVal);
    testObject(template[key], actualVal);
  });
};

// the shape of the type of an object map
const objectMapOfTypeShape = {
  contains: "$Type",
};

testCircular(
  {
    $Type: {
      fields: {
        __type__: objectMapOfTypeShape,
      },
      __type__: "$Type",
    },
  },
  {
    $Type: Type,
    // $ObjectMap: ObjectMap,
    // $Fn: Fn,
  }
);
