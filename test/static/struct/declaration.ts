import { StaticTest } from "../StaticTest";

import { strict as assert } from "node:assert";

export const config: StaticTest = {
  staticTest: (exports) => {
    const Point2DType = exports["Point2D"];
    assert.ok(Point2DType !== null);
    assert.ok(Point2DType.baseType === "type");
    const Point2D = Point2DType.type();
    assert.ok(Point2D.baseType === "struct");
  },
};
