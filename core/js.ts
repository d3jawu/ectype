"ectype:js";
import type { Type } from "./types.js";

const js = (behavior: () => unknown, type: Type) => behavior();

export { js };
