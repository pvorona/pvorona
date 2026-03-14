# `@pvorona/failable` Backlog Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land the remaining high-value `@pvorona/failable` backlog items by improving normalized plain-object error messages, tightening the publish gate around the real public contract, and fixing the `run(...)` `Success<never>` inference edge.

**Architecture:** Keep runtime semantics stable unless the backlog explicitly calls for a change. Improve plain-object normalization inside the shared `createFailable(...)` normalization path, pin the package contract with explicit exports plus public-surface assertions, and fix the `run(...)` type edge locally in the inference aliases without changing runtime control flow.

**Tech Stack:** TypeScript, Vitest, Nx, Vite, `tsc`

---

### Task 1: Improve `NormalizedErrors` plain-object messages

**Files:**
- Modify: `packages/failable/src/lib/failable.spec.ts`
- Modify: `packages/failable/src/lib/failable.ts`
- Modify: `packages/failable/tests/public-surface.spec.ts`

**Step 1: Write the failing tests**

Add red tests for the plain-object normalization path:
- In `packages/failable/src/lib/failable.spec.ts`, change the sync `NormalizedErrors` non-`Error` test to throw `const error = { code: 'bad_request' } as const`, then assert `result.error.message === JSON.stringify(error)` and `result.error.cause === error`.
- In the async rejection `NormalizedErrors` test, keep the plain-object rejection but add the same message assertion.
- Add one shared-path regression that normalizes an existing `failure(error)` or `FailableLikeFailure` input with `NormalizedErrors`, and assert the same message/cause pair.
- In `packages/failable/tests/public-surface.spec.ts`, add one consumer-facing smoke test that `createFailable(() => { throw { code: 'bad_request' }; }, NormalizedErrors)` produces an `Error` whose message is not `[object Object]` and whose `cause` is preserved.

**Step 2: Run the test target to verify it fails**

Run: `npm exec nx run "@pvorona/failable:test"`

Expected: the new message assertions fail because plain objects currently normalize through `String(error)` and become `[object Object]`.

**Step 3: Implement the minimal fix**

In `packages/failable/src/lib/failable.ts`:
- keep existing `Error` passthrough behavior unchanged
- keep array normalization to `AggregateError('Multiple errors')`
- replace the plain-object fallback with a safe serialized message instead of `String(error)`
- use `JSON.stringify(error)` for object-like values when it produces a string
- fall back to the current stringification path if serialization throws or returns a non-string
- keep `cause: error` unchanged

**Step 4: Run the package tests again**

Run: `npm exec nx run "@pvorona/failable:test"`

Expected: the new normalization tests pass and the existing runtime/type tests stay green.

**Step 5: Run the public-surface gate for the behavior**

Run: `npm exec nx run "@pvorona/failable:check-public-surface"`

Expected: public-surface runtime tests, consumer typecheck, build, and package-surface checks all pass with the improved message behavior.

### Task 2: Harden the publish gate around the real public contract

**Files:**
- Modify: `packages/failable/src/index.ts`
- Modify: `packages/failable/src/lib/failable.spec.ts`
- Modify: `packages/failable/tests/public-surface.spec.ts`
- Modify: `packages/failable/tests/consumer/failable-consumer.ts`
- Modify: `packages/failable/scripts/check-package-surface.mjs`

**Step 1: Write the failing contract and coverage tests**

Add red coverage for the gaps the backlog already calls out:
- In `packages/failable/src/lib/failable.spec.ts`, add `createFailable(...)` coverage for non-native `PromiseLike` inputs using the existing `createResolvingThenable(...)` and `createRejectingThenable(...)` helpers.
- Cover at least these cases: resolving thenable with raw data, resolving thenable with `Success`, resolving thenable with `FailableLikeSuccess`, rejecting thenable with a raw value, rejecting thenable with `NormalizedErrors`, and rejecting thenable with a custom `normalizeError`.
- In `packages/failable/tests/public-surface.spec.ts`, add a runtime namespace assertion over `await import('@pvorona/failable')` that pins the exact runtime export keys.
- In `packages/failable/tests/consumer/failable-consumer.ts`, replace the scattered negative export assertions with an exact `keyof ConsumerModule` assertion for runtime exports, and explicitly import/use `CreateFailableNormalizeErrorOptions` so the intended type export is pinned.

**Step 2: Run the internal and public checks to verify red**

Run: `npm exec nx run "@pvorona/failable:test"`

Run: `npm exec nx run "@pvorona/failable:check-public-surface"`

Expected: the new thenable coverage and export-contract assertions fail before the implementation changes land.

**Step 3: Implement the contract hardening**

Apply the smallest contract-pinning changes:
- replace `packages/failable/src/index.ts` `export *` with explicit `export { ... }` and `export type { ... }` lists
- keep `CreateFailableNormalizeErrorOptions` public and explicitly exported so the barrel matches the currently supported custom-normalizer contract
- preserve the existing runtime export set; do not add new public symbols
- in `packages/failable/scripts/check-package-surface.mjs`, assert that `package.json.exports` keys are exactly `.` and `./package.json` before validating tarball contents

**Step 4: Re-run the public contract checks**

Run: `npm exec nx run "@pvorona/failable:check-public-surface"`

Expected: the package now fails on export creep, passes with the explicit barrel, and covers the non-native `PromiseLike` surface end to end.

### Task 3: Fix the `run(...)` `Success<never>` inference edge

**Files:**
- Modify: `packages/failable/src/lib/failable.spec.ts`
- Modify: `packages/failable/src/lib/failable.ts`
- Modify: `packages/failable/tests/consumer/failable-consumer.ts`

**Step 1: Write the failing type regressions**

Add red type assertions for the exact edge:
- sync `run(function* () { return success(undefined as never); })` should infer `Success<never>`
- async `run(async function* () { return success(undefined as never); })` should infer `Promise<Success<never>>`
- a mixed case that yields `Failable<123, 'source-error'>` and later returns `success(undefined as never)` should infer `Failable<never, 'source-error'>`
- mirror at least one of those assertions in `packages/failable/tests/consumer/failable-consumer.ts` so the public package surface locks the fix in

**Step 2: Run the internal and public checks to verify red**

Run: `npm exec nx run "@pvorona/failable:test"`

Run: `npm exec nx run "@pvorona/failable:typecheck-public-api"`

Expected: the new type assertions fail because `InferRunResult` currently treats `InferRunReturnData<TResult> extends never` as failure-only.

**Step 3: Implement the minimal type-only fix**

In `packages/failable/src/lib/failable.ts`:
- keep the existing `[TResult] extends [never]` special case for throw-only builders
- stop using `InferRunReturnData<TResult> extends never` as the signal that no success branch exists
- instead, branch on the actual `TResult` shape so `Success<never>` and `Failable<never, E>` remain success-capable
- do not change runtime `run(...)` behavior

**Step 4: Re-run the relevant checks**

Run: `npm exec nx run "@pvorona/failable:test"`

Run: `npm exec nx run "@pvorona/failable:typecheck-public-api"`

Expected: the new inference assertions pass without changing runtime `run(...)` semantics.

### Task 4: Final verification and review

**Files:**
- Verify only: `packages/failable/src/lib/failable.ts`
- Verify only: `packages/failable/src/lib/failable.spec.ts`
- Verify only: `packages/failable/src/index.ts`
- Verify only: `packages/failable/tests/public-surface.spec.ts`
- Verify only: `packages/failable/tests/consumer/failable-consumer.ts`
- Verify only: `packages/failable/scripts/check-package-surface.mjs`

**Step 1: Run the full package verification sequence**

Run: `npm exec nx run "@pvorona/failable:lint"`

Run: `npm exec nx run "@pvorona/failable:test"`

Run: `npm exec nx run "@pvorona/failable:typecheck"`

Run: `npm exec nx run "@pvorona/failable:check-public-surface"`

Expected: lint, internal tests, declaration typecheck, build-backed public-surface checks, and package-surface checks all pass from the isolated worktree.

**Step 2: Dispatch final review**

Use a final reviewer over the completed diff with these explicit questions:
- does the plain-object normalization fix improve message quality without changing unrelated semantics?
- does the explicit barrel plus public-surface coverage fully pin the intended contract?
- does the `run(...)` type fix match runtime semantics and avoid new inference regressions?

**Step 3: Keep the branch uncommitted unless the user asks**

Do not create a git commit during execution unless the user explicitly requests one.
