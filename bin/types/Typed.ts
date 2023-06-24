import type { Type } from "../../core/types";
import type { ECExp, ECTypeMethod, ECVariantMethodCall } from "./ECNode";

export type Typed<T> = //
  // Exceptions for types that only exist after type-checking
  T extends ECTypeMethod
    ? ECTypeMethod & {
        ectype: Type;
      }
    : T extends ECVariantMethodCall
    ? Omit<ECVariantMethodCall, "arguments"> & {
        arguments: ECExp[];
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
