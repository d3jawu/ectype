import Type from "./type.js";

const Bool = Object.defineProperty(
  (val) => {
    if (typeof val === "boolean") return val;
    throw new Error(`${val} is not a boolean.`);
  },
  "__type__",
  { value: Type }
);
const Num = Object.defineProperty(
  (val) => {
    if (typeof val === "number") return val;
    throw new Error(`${val} is not a number.`);
  },
  "__type__",
  { value: Type }
);

const Str = Object.defineProperty(
  (val) => {
    if (typeof val === "string") return val;
    throw new Error(`${val} is not a string.`);
  },
  "__type__",
  { value: Type }
);

const Null = Object.defineProperty(
  (val) => {
    if (val === false || val === undefined || val === null) {
      return null;
    }

    throw new Error(`${val} cannot be cast to null.`);
  },
  "__type__",
  { value: Type }
);

export { Bool, Num, Str, Null };
