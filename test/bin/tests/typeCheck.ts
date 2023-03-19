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
    const scope = analyze(`
    const Point2D = struct({
      x: Num,
      y: Num,
    });
    
    const myPoint = Point2D.conform({
      x: 10,
    });`);

    const Point2DType = scope.get("Point2D");
    assert.ok(Point2DType !== null);
    assert.ok(Point2DType.__ktype__ === "type");
    const Point2D = Point2DType.type();
    assert.ok(Point2D.__ktype__ === "struct");
  });
}

export function variants() {
  assert.doesNotThrow(() => {
    analyze(`
      const IPAddr = variant({
        V4: Str,
        V6: Str,
      })
    `);
  });
}
