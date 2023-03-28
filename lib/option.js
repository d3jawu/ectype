// stdlib.js contains library functions implemented entirely in user-space.
import { variant } from "../core/variant.js";

import { Null } from "../core/primitives.js";

// TODO check that T is a Type
const option = (T) => variant({ Some: T, None: Null });

export { option };
