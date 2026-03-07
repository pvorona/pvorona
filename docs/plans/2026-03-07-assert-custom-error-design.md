# `@pvorona/assert` unified failure input design (2026-03-07)

## Goal

Allow `assert(...)` to accept either an assertion message or a caller-provided `Error` per call site without breaking existing callers that use the current positional signature.

## Public API

- `assert(condition, failure?, functionToSkipStackFrames?)`
- `type AssertFailure = undefined | string | Error | (() => string | Error)`

## Accepted `failure` inputs

- `undefined`
- `string`
- `Error`
- `() => string | Error`

`AssertFailure` is part of the public API so wrappers can reuse the same input contract instead of duplicating the union or reaching for `Parameters<typeof assert>[1]`.

## Compatibility and rationale

- Existing callers keep using `assert(condition)`, `assert(condition, 'message')`, and `assert(condition, () => 'message')`.
- New callers can provide `assert(condition, new MyError(...))` or `assert(condition, () => new MyError(...))`.
- `functionToSkipStackFrames` stays in the third argument for every supported call shape.
- Using one `failure` parameter avoids split overload families, which keeps wrappers and computed second arguments easy to forward.
- This first version keeps the single `assert(...)` entry point instead of adding a second helper.

## Runtime behavior

- If `condition` is `true`, `assert(...)` returns without creating or throwing anything.
- If `failure` is a function, resolve it only when `condition` is `false`.
- If the resolved `failure` is an `Error`, reuse it directly and pass it through `throwError(...)`.
- Otherwise treat the resolved `failure` as the assertion message and throw `new AssertionError(message)`.
- `functionToSkipStackFrames` continues to default to `assert`, so stack trimming remains consistent.
- `assert(...)` can now throw either `AssertionError` or a caller-provided `Error`, and the public docs should say that explicitly.

## Testing and docs

- Keep the existing `assert.spec.ts` coverage for the legacy signature.
- Add coverage for `assert(false, new CustomError(...))`.
- Add coverage for `assert(false, () => new CustomError(...))`, including the success-path case where the getter must not run.
- Add stack-trimming coverage for the unified `failure` parameter with the third argument.
- Export `AssertFailure` from the public package surface.
- Update the `@pvorona/assert` README and API reference to document:
  - `assert(condition, failure?, functionToSkipStackFrames?)`
  - that `assert(...)` can now throw either `AssertionError` or the caller-provided `Error`
  - the `AssertFailure` type and its supported shapes

## Non-goals

- No changes to the `ensure*` helpers in this first version.
- No package-level default custom error configuration.
- No changes to `AssertionError` itself.
