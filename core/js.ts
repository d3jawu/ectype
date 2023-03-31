"ectype:js";
import { Type } from "./types.js";

const js = (behavior: () => unknown, type: Type) => behavior();

export { js };
