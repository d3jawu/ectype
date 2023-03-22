import { Type } from "../../core/types";

export type StaticTest = {
  exec?: boolean; // false if the runtime test should not be executed (e.g. if it is expected to crash)
  staticTest?: (exports: Record<string, Type>) => void; // omit if static analysis should not be run
  throws?: boolean; // true if static analysis is expected to throw. staticTest will not be run.
};
