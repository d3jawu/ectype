"use ectype";

import { Type } from "../../../core/core.js";

// Can't call conform() on Type.
///INVALID_TYPE_METHOD
const A = Type.conform(10);
