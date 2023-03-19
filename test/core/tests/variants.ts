import { strict as assert } from "node:assert";
import { variant } from "../../../core/variant.js";
import { Str, Void } from "../../../core/primitives.js";
import type { Option } from "../../../core/types.js";

export function variants() {
  const MaybeStr = variant({
    Some: Str,
    None: Void,
  });

  const someStr = MaybeStr.of({ Some: "abc" }) as Option<string>;

  assert.ok(someStr.isSome());
  assert.ok(someStr.isNone() === false);
  assert.ok(someStr.Some === "abc");

  assert.ok(MaybeStr.Option.valid(someStr));

  const none = MaybeStr.of({ None: undefined });
  assert.ok(none.isNone());
  assert.ok(none.isSome() === false);

  assert.ok(MaybeStr.Option.valid(none));
}
