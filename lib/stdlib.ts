import { variant } from "./core.js";
import type { Type } from "./core.js";

import { Null } from "./primitives.js";

const option = (T: Type) => variant({ Some: T, None: Null });

export { option };
