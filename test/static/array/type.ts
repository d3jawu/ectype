import { StaticTest } from "../StaticTest";

import { strict as assert } from "node:assert";

export const config: StaticTest = {
  staticTest: (exports) => {
    const StrArrayType = exports["StrArray"];

    assert.ok(StrArrayType !== null);
    assert.ok(StrArrayType.baseType === "type");
    const StrArray = StrArrayType.type();
    assert.ok(StrArray.baseType === "array");
    assert.equal(StrArray.contains().baseType, "str");
  },
};
