"use ectype";

import { struct } from "../../../core/struct.js";
import { Num } from "../../../core/primitives.js";

import { someOf, None } from "../../../core/util.js";

import { strict as assert } from "node:assert";

const Point = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point.conform({
  x: 20,
  y: 30,
});

assert.deepEqual(
  JSON.stringify(maybePoint),
  JSON.stringify(
    someOf({
      x: 20,
      y: 30,
    })
  )
);

const Vector = struct({
  start: Point,
  end: Point,
});

let maybeVector = Vector.conform({
  start: {
    x: 10,
    y: 15,
  },
  end: {
    x: 20,
    y: 40,
  },
});

assert.deepEqual(
  JSON.stringify(maybeVector),
  JSON.stringify(
    someOf({
      start: {
        x: 10,
        y: 15,
      },
      end: {
        x: 20,
        y: 40,
      },
    })
  )
);

maybeVector = Vector.conform({
  start: {
    x: 10,
    y: 15,
  },
  end: {
    x: 20,
    y: "oops",
  },
});

assert.deepEqual(JSON.stringify(maybeVector), JSON.stringify(None));
