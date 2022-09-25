import { Unit } from "./primitives.js";
import Variant from "./variant.js";

const option = (T) =>
  Variant({
    Some: T,
    None: Unit,
  });

const objectMap = (T) => 
  () => {
    
  }

export { option };
