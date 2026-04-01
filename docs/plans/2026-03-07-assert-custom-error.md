# `@pvorona/assert` unified failure input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend `assert(...)` so its second argument can be either an assertion message or a caller-provided `Error`, export that contract as `AssertFailure`, and preserve backward compatibility with one consistent third `functionToSkipStackFrames` argument.

**Architecture:** Replace the split overload idea with one unified `failure` parameter in `packages/assert/src/lib/assert.ts`. Export the second-argument contract as `AssertFailure`, resolve it lazily when it is a function, turn string-like failures into `AssertionError`, and pass `Error` values directly through `throwError(...)`. Add source-level JSDoc on both `AssertFailure` and `assert(...)` so editor hover/signature help explains the supported shapes, lazy semantics, and throw contract. Drive the change with `assert.spec.ts` first, then update `packages/assert/README.md` so the API reference, throw contract, JSDoc wording, and `AssertFailure` surface are explicit.

**Tech Stack:** TypeScript, Vitest, Nx, Vite, Markdown

---

### Task 1: Extend `assert(...)` with a unified `failure` parameter

**Files:**

- Modify: `packages/assert/src/lib/assert.spec.ts`
- Modify: `packages/assert/src/lib/assert.ts`
- Delete: `packages/assert/src/lib/getMessage.ts`
- Test: `packages/assert/src/index.ts`

**Step 1: Write the failing tests**

Add these tests to `packages/assert/src/lib/assert.spec.ts`:

```ts
describe('when failure is an Error instance', () => {
  it('throws the provided error instance', () => {
    class CustomError extends Error {
      override readonly name = 'CustomError';
    }

    const error = new CustomError('custom');

    expect(() => assert(false, error)).toThrow(error);
  });
});

describe('when failure is an Error getter', () => {
  it('throws the error returned by the getter', () => {
    class CustomError extends Error {
      override readonly name = 'CustomError';
    }

    expect(() => assert(false, () => new CustomError('from getter'))).toThrow(
      CustomError
    );
  });

  it("doesn't invoke the getter when condition is true", () => {
    const errorGetter = vi.fn(() => new Error('boom'));

    expect(() => assert(true, errorGetter)).not.toThrow();
    expect(errorGetter).not.toHaveBeenCalled();
  });
});

describe('when functionToSkipStackFrames is specified', () => {
  it('removes the given function from the stack trace', () => {
    function wrapper() {
      assert(false, new Error('trace'), wrapper);
    }

    try {
      wrapper();
    } catch (error) {
      expect((error as Error).stack).not.toContain('wrapper');
    }
  });
});
```

**Step 2: Run the tests to verify RED**

Run: `npm exec nx run @pvorona/assert:test`

Expected: the test run fails because `assert(...)` does not yet accept `Error` values or `() => Error` getters in its second argument.

**Step 3: Write the minimal implementation**

Update `packages/assert/src/lib/assert.ts` to use one `failure` parameter, export `AssertFailure`, add JSDoc for both the type and the function, and delete `packages/assert/src/lib/getMessage.ts` after moving the resolution logic inline:

```ts
import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';
import { throwError } from '@pvorona/throw-error';
import { AssertionError } from './AssertionError.js';

/**
 * Failure input accepted by `assert(...)`.
 *
 * The lazy function form must return a message or `Error`.
 * Do not throw from inside the callback if you want
 * `functionToSkipStackFrames` to apply consistently.
 */
export type AssertFailure = undefined | string | Error | (() => string | Error);

/**
 * Throws when `condition` is `false`.
 *
 * `failure` may be a message, a custom `Error`, or a lazy callback that
 * returns either one. Failed assertions throw `AssertionError` unless a
 * caller-provided `Error` is returned or passed directly.
 */
export function assert(
  condition: boolean,
  failure?: AssertFailure,
  functionToSkipStackFrames: Function = assert
): asserts condition {
  if (condition) return;

  const resolvedFailure =
    typeof failure === 'function'
      ? resolveValueOrGetter<string | Error>(failure)
      : failure;

  if (resolvedFailure instanceof Error) {
    throwError(resolvedFailure, functionToSkipStackFrames);
  }

  throwError(new AssertionError(resolvedFailure), functionToSkipStackFrames);
}
```

Keep the implementation in `assert.ts` unless the file becomes hard to scan. Do not change `AssertionError.ts`.

The JSDoc should explicitly cover:

- the supported `AssertFailure` shapes
- that the function form is lazy
- that `assert(...)` may throw either `AssertionError` or the caller-provided `Error`
- that the lazy callback should return the failure value instead of throwing it

**Step 4: Run the tests to verify GREEN**

Run: `npm exec nx run @pvorona/assert:test`

Expected: all `@pvorona/assert` tests pass, including the new `Error` and `() => Error` coverage in `assert.spec.ts`.

**Step 5: Commit**

Run:

- `git add packages/assert/src/lib/assert.ts packages/assert/src/lib/assert.spec.ts`
- `git rm packages/assert/src/lib/getMessage.ts`
- `git commit -m "Allow unified \`AssertFailure\` in \`assert(...)\`"`

---

### Task 2: Document the unified `failure` parameter and verify the package

**Files:**

- Modify: `packages/assert/README.md`
- Test: `packages/assert/src/lib/assert.spec.ts`
- Test: `packages/assert/src/index.ts`

**Step 1: Update the README**

Adjust `packages/assert/README.md` so it documents the unified `failure` parameter clearly:

- Keep the existing message-based example.
- Add one short custom-error example, for example:

```ts
import { assert } from '@pvorona/assert';

assert(user != null, () => new MissingUserError('User is required'));
```

- Update the API reference entry for `assert(...)` so it explicitly shows:
  - `assert(condition, failure?, functionToSkipStackFrames?)`
- Add one short note that `assert(...)` can now throw either `AssertionError` or the caller-provided `Error`.
- Add `AssertFailure` to the documented public API surface.
- Keep the README wording aligned with the JSDoc on `AssertFailure` and `assert(...)`.
- List the supported `failure` shapes:
  - `string`
  - `() => string`
  - `Error`
  - `() => Error`
- Add one short note recommending the function form for custom errors when the construction is non-trivial or should stay off the success path.
- Keep the scope explicit: this feature applies to `assert(...)`, not the `ensure*` helpers.

**Step 2: Run the package verification**

Run:

- `git diff --check`
- `npm exec nx run @pvorona/assert:typecheck`
- `npm exec nx run @pvorona/assert:test`
- `npm exec nx run @pvorona/assert:lint`

Expected:

- `git diff --check` reports no whitespace or merge-marker issues
- `@pvorona/assert:typecheck` passes with the new `failure` parameter types
- `@pvorona/assert:test` passes
- `@pvorona/assert:lint` passes

**Step 3: Commit**

Run:

- `git add packages/assert/README.md`
- `git commit -m "Document \`AssertFailure\` and unified \`assert(...)\` inputs"`
