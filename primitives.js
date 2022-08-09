// TODO primitive types
const Bool = (val) => {
  if (typeof val === "boolean") return val;
  throw new Error(``);
};
const Num = (val) => {
  if (typeof val === "number") return val;
  throw new Error();
};

const Str = (val) => {
  if (typeof val === "string") return val;
  throw new Error();
};

const Null = (val) => {
  if (val === false || val === undefined || val === null) {
    return null;
  }

  throw new Error(`${val} cannot be cast to null.`);
};

export { Bool, Num, Str, Null };
