"use ectype";

import { Bool, Num, Str, Type, fn, struct } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";
const pair = fn([Type], Type).from((T) =>
  struct({
    a: T,
    b: T,
  })
);

const NumPair = pair(Num);

// Correct handler arg type, correct incoming value
ok(
  NumPair.conform({
    a: 10,
    b: 20,
  }).match({
    Some: fn([struct({ a: Num, b: Num })], Bool).from((p) => {
      ok(p.a === 10);
      ok(p.b === 20);
      return true;
    }),
    _: fn([], Bool).from(() => {
      return false;
    }),
  })
);

// Correct handler arg type, wrong incoming value.
ok(
  NumPair.conform({
    a: "abc",
    b: "xyz",
  }).match({
    Some: fn([struct({ a: Num, b: Num })], Bool).from((p) => {
      return false;
    }),
    _: fn([], Bool).from(() => {
      return true;
    }),
  })
);

// Wrong arg type should fall back to wildcard.
ok(
  NumPair.conform({
    a: 10,
    b: 20,
  }).match({
    Some: fn([struct({ x: Str, y: Str })], Bool).from((p) => {
      return false;
    }),
    None: fn([], Bool).from(() => {
      return false;
    }),
    _: fn([], Bool).from(() => {
      return true;
    }),
  })
);

// Wrong arg type should fall back to wildcard even if incoming value matches.
ok(
  NumPair.conform({
    x: "abc",
    y: "xyz",
  }).match({
    Some: fn([struct({ x: Str, y: Str })], Bool).from((p) => {
      return false;
    }),
    _: fn([], Bool).from(() => {
      return true;
    }),
  })
);
