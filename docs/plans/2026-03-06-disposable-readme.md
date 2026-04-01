# Disposable README Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `packages/disposable/README.md` so it is clearer for first-time readers while keeping the documented disposal semantics accurate.

**Architecture:** This is a docs-only change. Reframe the README around the mainstream disposal lifecycle, replace the current browser-skewed quick start with one self-contained example, and explain failure handling in plain English without changing the package API. Use `packages/disposable/src/lib/disposable.ts` and `packages/disposable/src/lib/disposable.spec.ts` as the source of truth for wording and examples.

**Tech Stack:** Markdown, Git, Nx, TypeScript source/docs

---

### Task 1: Reframe the README around the lifecycle

**Files:**

- Modify: `packages/disposable/README.md`
- Read: `packages/disposable/src/lib/disposable.ts`
- Read: `packages/disposable/src/lib/disposable.spec.ts`

**Step 1: Review the current README against the implementation**

Read:

- `packages/disposable/README.md`
- `packages/disposable/src/lib/disposable.ts`
- `packages/disposable/src/lib/disposable.spec.ts`

Confirm the wording that must stay accurate:

- `dispose()` is synchronous and idempotent
- `onDispose(...)` runs before `isDisposed` flips to `true`
- `onDisposed(...)` waits only for promise-returning cleanup
- cleanup failures are aggregated into `DisposeError.errors`

**Step 2: Replace the opener**

Rewrite the opening paragraph so it answers:

- when to use `createDisposable()`
- what kind of cleanup it coordinates
- why `onDisposed(...)` exists

Keep it concise. Do not start with abstract wording like "observe when disposal has fully settled" without context.

**Step 3: Add a lifecycle section before the first example**

Add a short section that explains the mainstream flow in plain language:

- register cleanup with `onDispose(...)`
- start teardown with `dispose()`
- observe the final result with `onDisposed(...)`

Make the `isDisposing` / `isDisposed` timing explicit, but do not document advanced queue-mutation behavior.

---

### Task 2: Rewrite the examples and API text

**Files:**

- Modify: `packages/disposable/README.md`

**Step 1: Replace the Quick Start**

Use one self-contained example that:

- imports only `createDisposable`
- registers at least one synchronous cleanup callback
- registers at least one async cleanup callback
- handles `result.isError` safely by logging `result.error.errors`
- avoids browser-specific globals like `window`, `observer`, or undeclared callback names

**Step 2: Add a failure-handling section**

Make sure the README says:

- cleanup is best-effort
- `dispose()` does not throw when listeners fail
- failures surface through `DisposeResult`
- `DisposeError.errors` contains raw thrown or rejected `unknown` values, not guaranteed `Error` objects

**Step 3: Tighten the remaining sections**

Keep the README focused on the mainstream lifecycle:

- keep `Install`
- keep concise usage examples for removing cleanup, waiting for async cleanup, and `AbortController`
- keep the API section, but add a plain-English bridge for `DisposeResult = Failable<null, DisposeError>`

Do not add advanced re-entrancy or queue-mutation notes to the README.

---

### Task 3: Verify and finalize the docs change

**Files:**

- Modify: `packages/disposable/README.md`
- Create: `docs/plans/2026-03-06-disposable-readme.md`

**Step 1: Check the diff for formatting issues**

Run:

- `git diff --check`

Expected:

- no whitespace errors
- no merge markers

**Step 2: Run the package tests as a source-of-truth verification**

Run:

- `npm exec nx run "@pvorona/disposable:test"`

Expected:

- Nx runs the `@pvorona/disposable:test` target successfully

**Step 3: Review the final diff**

Run:

- `git diff -- packages/disposable/README.md docs/plans/2026-03-06-disposable-readme.md`

Expected:

- only the README rewrite and this plan file are included
- no unrelated files are modified by the implementation work

**Step 4: Commit**

Run:

- `git add packages/disposable/README.md docs/plans/2026-03-06-disposable-readme.md`
- `git commit -m "Update \`@pvorona/disposable\` README"`
