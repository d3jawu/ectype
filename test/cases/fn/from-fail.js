"use ectype";

import { Num, Str, fn, fna } from "../../../core/core.js";

// Constructing instances that don't match the (a)synchronicity of the function
// type should fail.
const FnType = fn([Str], Num);

///ASYNC_MISMATCH
FnType.from(async (n) => "abc");

const FnaType = fna([Str], Num);

///ASYNC_MISMATCH
FnaType.from((n) => "abc");

// Constructing an instance that doesn't match the return type should fail, even
// if another branch returns the correct type.
FnType.from((p) => {
  if (p === "abc") {
    return 10;
  }

  ///EXPECTED_RETURN_TYPE_MISMATCH
  return "xyz";
});

FnType.from((p) => {
  if (p === "abc") {
    ///EXPECTED_RETURN_TYPE_MISMATCH
    return "abc";
  }

  return 10;
});

// Should fail for expression functions, too.
///EXPECTED_RETURN_TYPE_MISMATCH
FnType.from((n) => "abc");
