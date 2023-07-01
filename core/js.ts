"ectype:js";
import { Null } from "./primitives.js";
import type { Type } from "./types.js";

const js = (behavior: () => unknown, type: Type = Null) => behavior();

export { js };
