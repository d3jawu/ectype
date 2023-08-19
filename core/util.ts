import type { Option } from "./types.js";

// Creates a Some() option instance wrapping the given value. For internal use only (not type-safe).
const someOf = <T>(val: T): Option<T> => ({
  Some: val,
  when: (handlers: Record<string, (unwrapped?: unknown) => unknown>) =>
    handlers!.Some(val),
});

const None = {
  None: undefined,
  when: (handlers: Record<string, (unwrapped?: unknown) => unknown>) =>
    handlers!.None(),
};

export { None, someOf };
