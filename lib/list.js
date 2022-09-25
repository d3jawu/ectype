import Type from "./type";

let ListType = struct({
  contains: Type,
});

const list = (type) => {
  const type = ListType({
    contains: type,
  });

  const constructor = (incoming) => {
    if (!Array.isArray) {
      throw new Error(
        `${incoming} is not an array (got ${typeof incoming} instead.)`
      );
    }

    // TODO adapt Array functions to type

    return Object.defineProperty([...incoming], "__type__", {
      value: type,
    });
  };

  return [constructor, type];
};

export { list, ListType };
