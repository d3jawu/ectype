"use ectype";

import { Num, Str, Type, fn, struct, variant } from "../../../core/core.js";

import { ok } from "../../lib/assert.js";
const pair = fn([Type], Type).from((T) =>
  struct({
    a: T,
    b: T,
  }),
);

const NumPair = pair(Num);

// Correct handler arg type, correct incoming value
ok(
  variant.match(
    NumPair.conform({
      a: 10,
      b: 20,
    }),
    {
      Some: [
        struct({ a: Num, b: Num }),
        (p) => {
          ok(p.a === 10);
          ok(p.b === 20);
          return true;
        },
      ],
      _: () => {
        return false;
      },
    },
  ),
);

// Correct handler arg type, wrong incoming value.
ok(
  variant.match(
    NumPair.conform({
      a: "abc",
      b: "xyz",
    }),
    {
      Some: [
        struct({ a: Num, b: Num }),
        (p) => {
          return false;
        },
      ],
      _: () => {
        return true;
      },
    },
  ),
);

// Wrong arg type should fall back to wildcard.
ok(
  variant.match(
    NumPair.conform({
      a: 10,
      b: 20,
    }),
    {
      Some: [
        struct({ x: Str, y: Str }),
        (p) => {
          return false;
        },
      ],
      None: () => {
        return false;
      },
      _: () => {
        return true;
      },
    },
  ),
);

// Wrong arg type should fall back to wildcard even if incoming value matches.
ok(
  variant.match(
    NumPair.conform({
      x: "abc",
      y: "xyz",
    }),
    {
      Some: [
        struct({ x: Str, y: Str }),
        (p) => {
          return false;
        },
      ],
      _: () => {
        return true;
      },
    },
  ),
);
