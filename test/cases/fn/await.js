"use ectype";

import { Str, fna } from "../../../core/core.js";
import { ok } from "../../lib/assert.js";

const FnaType = fna([], Str);

const myFna = FnaType.from(async () => "abc");

ok((await myFna()) === "abc");
