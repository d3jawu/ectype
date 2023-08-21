"use ectype";

import { fn } from "../../../core/fn.js";
import { js } from "../../../core/js.js";
import { Null, Num, Str, Type } from "../../../core/primitives.js";
import { struct } from "../../../core/struct.js";

import { ok } from "../../lib/assert.js";
const pair = fn([Type], Type).from((T) =>
  struct({
    a: T,
    b: T,
  })
);

const NumPair = pair(Num);

// Correct handler arg type, correct incoming value
NumPair.conform({
  a: 10,
  b: 20,
}).when({
  Some: fn([struct({ a: Num, b: Num })], Null).from((p) => {
    ok(p.a === 10);
    ok(p.b === 20);
    return null;
  }),
  _: fn([], Null).from(() => {
    js(() => {
      throw new Error(`wildcard handler should not run when type is correct`);
    });
    return null;
  }),
});

// Correct handler arg type, wrong incoming value.
NumPair.conform({
  a: "abc",
  b: "xyz",
}).when({
  Some: fn([struct({ a: Num, b: Num })], Null).from((p) => {
    js(() => {
      throw new Error(
        `Some() handler should not run when value is of wrong type`
      );
    });
    return null;
  }),
  _: fn([], Null).from(() => {
    return null;
  }),
});

// Wrong arg type should fall back to wildcard.
NumPair.conform({
  a: 10,
  b: 20,
}).when({
  Some: fn([struct({ x: Str, y: Str })], Null).from((p) => {
    js(() => {
      throw new Error(
        `Some() handler should not run when argument does not match variant`
      );
    });

    return null;
  }),
  None: fn([], Null).from(() => {
    js(() => {
      throw new Error(
        `None() handler should not run when argument does not match variant`
      );
    });

    return null;
  }),
  _: fn([], Null).from(() => {
    return null;
  }),
});

// Wrong arg type should fall back to wildcard even if incoming value matches.
NumPair.conform({
  x: "abc",
  y: "xyz",
}).when({
  Some: fn([struct({ x: Str, y: Str })], Null).from((p) => {
    js(() => {
      throw new Error(
        `Some() handler should not run when argument does not match variant, even if incoming value matches handler argument.`
      );
    });

    return null;
  }),
  _: fn([], Null).from(() => {
    return null;
  }),
});
