import { analyze } from "../run.js";

import { strict as assert } from "node:assert";

export function basics() {
  assert.throws(() => {
    analyze(`
    let n = 10;
    n = "abc";`);
  });
}

export function structs() {
  assert.throws(() => {
    analyze(`
    const Point2D = struct({
      x: Num,
      y: Num,
    });
    
    const myPoint = Point2D.from({
      x: 10,
    });`);
  });

  assert.doesNotThrow(() => {
    analyze(`
    const Point2D = struct({
      x: Num,
      y: Num,
    });
    
    const myPoint = Point2D.conform({
      x: 10,
    });`);
  });
}
