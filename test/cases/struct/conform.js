"use ectype";

import { Bool, Num, fn, struct } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";

const Point = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point.conform({
  x: 20,
  y: 30,
});

ok(
  maybePoint.match({
    Some: fn([Point], Bool).from((p) => {
      ok(p.x === 20);
      ok(p.y === 30);
      return true;
    }),
    None: fn([], Bool).from(() => {
      return false;
    }),
  })
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

ok(
  maybeVector.match({
    Some: fn([Vector], Bool).from((p) => {
      ok(p.start.x === 10);
      ok(p.start.y === 15);
      ok(p.end.x === 20);
      ok(p.end.y === 40);
      return true;
    }),
    None: fn([], Bool).from(() => {
      return false;
    }),
  })
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

ok(
  maybeVector.match({
    Some: fn([], Bool).from(() => {
      return false;
    }),
    None: fn([], Bool).from(() => {
      return true;
    }),
  })
);
