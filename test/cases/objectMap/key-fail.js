"use ectype";

import { objectMap, Str, js } from "../../../core/core.js";

const StrMap = objectMap(Str);

const map = StrMap.from({});

let a = "abcd";
let b = 10;

map[a];
///INDEX_TYPE_MISMATCH
map[b];
