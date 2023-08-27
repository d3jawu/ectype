// stdlib.js contains library functions implemented entirely in user-space.
import { Null, variant } from "../core/core.js";

// TODO check that T is a Type
const option = (T) => variant({ Some: T, None: Null });

export { option };
