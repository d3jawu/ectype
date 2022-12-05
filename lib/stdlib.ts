import { variant } from "./core.js";
import type { Type } from "./core.js";

import { Null } from "./primitives.js";

const option = (T: Type<unknown>) => variant({ Some: T, None: Null });

export { option };
