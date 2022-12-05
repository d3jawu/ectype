// stdlib.js contains library functions implemented entirely in Kythera user-space.
import { variant } from "./core.js";

import { Null } from "./primitives.js";

// TODO check that T is a Type
const option = (T) => variant({ Some: T, None: Null });

export { option };
