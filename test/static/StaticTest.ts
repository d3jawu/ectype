import { Type } from "../../core/types";

export type StaticTest = {
  // set false if the runtime test should not be executed (e.g. if it is expected to crash)
  exec?: boolean;
  // set true if runtime test is expected to throw
  execThrows?: boolean;
  // define a custom static analysis test. types of exported values are available in the parameter.
  staticTest?: (exports: Record<string, Type>) => void;
  // true if static analysis is expected to throw. staticTest will not be run.
  analysisThrows?: boolean;
};
