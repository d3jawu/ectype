import type { Type } from "../../core/core";
import type {
  ECExp,
  ECJSCall,
  ECTypeDeclaration,
  ECTypeMethodCall,
  ECVariantMethodCall,
} from "./ECNode";

export type Typed<T> = //
  // Exceptions for types that only exist after type-checking
  T extends ECTypeMethodCall
    ? ECTypeMethodCall & {
        ectype: Type;
      }
    : T extends ECJSCall
    ? ECJSCall & {
        ectype: Type;
      }
    : T extends ECVariantMethodCall
    ? Omit<ECVariantMethodCall, "variant"> & {
        variant: Typed<ECExp>;
        ectype: Type;
      }
    : T extends ECTypeDeclaration
    ? ECTypeDeclaration & {
        ectype: Type;
      }
    : // Normal expression
    T extends ECExp
    ? {
        [K in keyof T]: Typed<T[K]>;
      } & { ectype: Type }
    : // Array of expressions
    T extends ECExp[]
    ? Typed<T[0]>[]
    : // Any object (which might contain expressions within it), e.g. ECStatement
    T extends object
    ? {
        [K in keyof T]: Typed<T[K]>;
      }
    : T;

export type TypedExp = Typed<ECExp>;
