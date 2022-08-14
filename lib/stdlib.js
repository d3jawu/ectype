import { Null } from "./primitives.js";
import { variant } from "./variant.js";

const option = (T) =>
  variant({
    Some: T,
    None: Null,
  });

export { option };
