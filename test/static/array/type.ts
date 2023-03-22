import { StaticTest } from "../StaticTest";

import { strict as assert } from "node:assert";

export const test: StaticTest = {
  staticTest: (exports) => {
    const StrArrayType = exports["StrArray"];

    assert.ok(StrArrayType !== null);
    assert.ok(StrArrayType.__ktype__ === "type");
    const StrArray = StrArrayType.type();
    assert.ok(StrArray.__ktype__ === "array");
    assert.equal(StrArray.contains().__ktype__, "str");
  },
};
