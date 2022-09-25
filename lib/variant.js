import Type from "./type.js";
import { objectMap } from "./stdlib.js";
import { struct } from "./struct.js";

const VariantType = struct({
  tags: objectMap(Type)[1],
});

const variant = (values) => {
  const variant = (incoming) => {
    if (typeof incoming !== "object")
      throw new Error("Variant instance must be specified with an object.");

    // TODO error handle
    const [[tag, val]] = Object.entries(incoming);

    return variant[tag](val);
  };

  // constructors for variant tags. each tag is its own constructor.
  Object.entries(values).forEach(([tag, type]) => {
    variant[tag] = (val) => {
      val = type(val);

      return Object.defineProperty({ [tag]: val }, "__type__", {
        // TODO what should the type of a variant member be? not sure
        value: variant[tag],
      });
    };

    // set constructor's own type as the variant it belongs to
    Object.defineProperty(variant[tag], "__type__", {
      // TODO function type
      value: variant,
    });
  });

  return variant;
};

export { variant, VariantType };
