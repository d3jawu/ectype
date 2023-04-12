import type { Option } from "./types.js";

// Creates a Some() option instance wrapping the given value. For internal use only (not type-safe).
const someOf = <T>(val: T): Option<T> => ({
  Some: val,
  isSome: (() => true) as () => true,
  isNone: (() => false) as () => false,
  when: (handlers: Record<string, (unwrapped?: unknown) => unknown>) =>
    handlers!.Some(val),
});

const None = {
  None: undefined,
  isSome: (() => false) as () => false,
  isNone: (() => true) as () => true,
  when: (handlers: Record<string, (unwrapped?: unknown) => unknown>) =>
    handlers!.None(),
};

export { someOf, None };
