"use ectype";

import { Num, struct, variant } from "../../../core/core.js";

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
  variant.match(maybePoint, {
    Some: (p) => {
      ok(p.x === 20);
      ok(p.y === 30);
      return true;
    },
    None: () => {
      return false;
    },
  }),
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
  variant.match(maybeVector, {
    Some: (p) => {
      ok(p.start.x === 10);
      ok(p.start.y === 15);
      ok(p.end.x === 20);
      ok(p.end.y === 40);
      return true;
    },
    None: () => {
      return false;
    },
  }),
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
  variant.match(maybeVector, {
    Some: () => {
      return false;
    },
    None: () => {
      return true;
    },
  }),
);
