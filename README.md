# Ectype

Thanks for your interest in Ectype! Everything’s still very much in its early stages, so things are subject to (potentially major) change. More comprehensive documentation is also to come. But if that doesn’t deter you, here’s how you can get started:

**If you are here from the Strange Loop talk, some syntax around variants has changed! Check the demo file for a refresher.**

# Usage

Install with `npm install ectype`. Lint/type-check a script with `npx ectype check [entrypoint.js]`.

Ectype files must begin with `"use ectype"`. If a file is missing this directive, the analyzer will assume it is an untyped JavaScript file and ignore it.

Once it passes the linter/type-checker you can run an Ectype file directly.

See test cases and demo.js for examples. A proper introduction is coming soon.

# Development

Ectype is being implemented with TypeScript until it is capable of self-hosting.

`npm run build` to compile, `npm run watch` for a watcher. Built files go into `dist`.

Feel free to email me about Ectype at holly@dejawu.me.

## Testing

`npm run test` to run test cases. Test cases live in `test/cases`. If a test case is expected to fail static analysis, end the filename in `-fail.js`. To skip a test, end the filename in `-skip.js`.