"use ectype";

import { Null, Num } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

import { js } from "../../../core/js.js";

import { fn } from "../../../core/fn.js";
import { ok } from "../../lib/assert.js";

const Point = struct({
  x: Num,
  y: Num,
});

const maybePoint = Point.conform({
  x: 20,
  y: 30,
});

maybePoint.when({
  Some: fn([Point], Null).from((p) => {
    ok(p.x === 20);
    ok(p.y === 30);
    return null;
  }),
  None: fn([], Null).from(() => {
    js(() => {
      throw new Error(`expected Some but got None.`);
    });
    return null;
  }),
});

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

maybeVector.when({
  Some: fn([Vector], Null).from((p) => {
    ok(p.start.x === 10);
    ok(p.start.y === 15);
    ok(p.end.x === 20);
    ok(p.end.y === 40);
    return null;
  }),
  None: fn([], Null).from(() => {
    js(() => {
      throw new Error(`expected Some but got None.`);
    });
    return null;
  }),
});

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

maybeVector.when({
  Some: fn([], Null).from(() => {
    js(() => {
      throw new Error(`expected None but got Some.`);
    });
    return null;
  }),
  None: fn([], Null).from(() => {
    return null;
  }),
});
