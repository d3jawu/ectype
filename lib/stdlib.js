import { Null } from "./primitives.js";
import Variant from "./variant.js";

const option = (T) =>
  Variant({
    Some: T,
    None: Null,
  });

export { option };
