import { typeOf } from "./types.js";
// variant type (TODO)
const Variant = {};

const variant = (values) => {
  // type constructor is convenience function, same as using one of the tag constructors.
  const variant = (incoming) => {
    if (typeof incoming !== "object") {
      throw new Error("Variant instance must be specified with an object.");
    }

    const [[tag, val]] = Object.entries(incoming);

    return variant[tag](val);
  };

  // constructors for variant tags
  // each tag is its own constructor.
  Object.entries(values).forEach(([tag, type]) => {
    variant[tag] = (val) => {
      val = type(val);

      return Object.defineProperty({ [tag]: val }, "__type__", {
        value: variant[tag],
      });
    };

    // set constructor's type as parent variant (?)
    Object.defineProperty(variant[tag], "__type__", {
      value: variant,
    });

    // TODO eq (comparison for variant values) (implement Comparable?)
  });

  variant.__type__ = Variant;

  // if val's type constructor belongs to this variant
  variant.has = (val) => {
    if (typeof val !== "object") {
      return false;
    }

    return Object.values(variant).some(
      (tagConstructor) => tagConstructor == typeOf(val)
    );
  };

  return variant;
};

export { Variant, variant };
