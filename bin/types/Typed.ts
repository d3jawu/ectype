import type { Type } from "../../core/types";
import type { ECExp, ECTypeMethod } from "./ECNode";

export type Typed<T> = //
  T extends ECTypeMethod // Special exception: don't try to type the expressions within ECTypeMethod (they're meant to remain untyped.)
    ? ECTypeMethod & {
        ectype: Type;
      }
    : T extends ECExp
    ? {
        [K in keyof T]: Typed<T[K]>;
      } & { ectype: Type }
    : T extends ECExp[]
    ? Typed<T[0]>[]
    : T extends object // includes ECStatement
    ? {
        [K in keyof T]: Typed<T[K]>;
      }
    : T;

export type TypedExp = Typed<ECExp>;
