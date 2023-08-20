"use ectype";

import { Type } from "../../../core/primitives.js";

// Can't call conform() on Type.
const A = Type.conform(10);
