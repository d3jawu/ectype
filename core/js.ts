"ectype:js";
import { Void } from "./primitives.js";
import type { Type } from "./types.js";

const js = (behavior: () => unknown, type: Type = Void) => behavior();

export { js };
