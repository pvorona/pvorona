# `@pvorona/assert` README Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `packages/assert/README.md` so first-time users can understand `@pvorona/assert` quickly, while every documented claim stays aligned with the current public API.

**Architecture:** This is a docs-only change centered on `packages/assert/README.md`. Use `packages/assert/src/index.ts` as the source of truth for the exported surface and the existing Vitest specs as the source of truth for helper behavior. Prefer simplifying and reordering the README over adding more prose, and only document behaviors that are backed by the current source and tests.

**Tech Stack:** Markdown, Git, Nx, Vitest

---

### Task 1: Rebuild the README structure

**Files:**
- Modify: `packages/assert/README.md`
- Test: `packages/assert/src/index.ts`

**Step 1: Rewrite the opening summary**

Replace the current one-line description with a plain-language summary that says the package is for:
- runtime assertions
- nullish narrowing
- object and property checks
- array and number helper predicates

Keep the summary focused on what a new user can do after importing the package.

**Step 2: Merge setup and compatibility notes**

Combine `Install` and `ESM and tooling` into one short setup section.

Make the wording explicit:
- the published package contract is ESM-only
- the published package requires Node `>=20`
- TypeScript `5.9+` is the current repo baseline used to verify the package, not a published `engines` constraint

**Step 3: Replace `Important semantics` with a reader-first section**

Rename the section to something like `When this package fits` or `How these helpers are meant to be used`.

This section should explain:
- these helpers are mainly for narrowing existing unions, not for loose `unknown -> whatever` casts
- which helpers are for `undefined`, `null`, and `null | undefined`
- when to use this package and when a local one-off check is enough

**Step 4: Move migration history out of the happy path**

Move both breaking-change callouts and the current migration content into one compact appendix at the end of the README.

Keep only the current public API in the main path.

**Step 5: Commit the structural rewrite**

Run:
- `git add packages/assert/README.md`
- `git commit -m "Restructure \`@pvorona/assert\` README"`

---

### Task 2: Rewrite the quick start with beginner-first examples

**Files:**
- Modify: `packages/assert/README.md`
- Test: `packages/assert/src/lib/assert.spec.ts`
- Test: `packages/assert/src/lib/ensureNotNullOrUndefined.spec.ts`
- Test: `packages/assert/src/lib/hasOwnPropertyValue.spec.ts`
- Test: `packages/assert/src/lib/isObject.spec.ts`
- Test: `packages/assert/src/lib/isString.spec.ts`

**Step 1: Keep one short `assert(...)` example**

Use one compact example that is easy to scan in under a minute.

Make sure the surrounding text says:
- `assert(...)` expects a boolean condition
- failed assertions throw `AssertionError`
- the message can be a string or a lazy getter

**Step 2: Replace the DOM-only nullish example**

Replace the current `ensureNotNull(...)` quick-start example with a minimal `ensureNotNullOrUndefined(...)` example.

Show:
- the allowed input shape is `T | null | undefined`
- the returned value is narrowed to `T`
- one-sided alternatives such as `ensureDefined(...)` and `ensureNotNull(...)` exist for `T | undefined` and `T | null`

If you still want to keep the DOM example, move it to a later note instead of the main quick start.

**Step 3: Replace the advanced property example**

Replace or demote the symbol-branded `hasOwnKey(...)` example.

Add one simpler `hasOwnPropertyValue(...)` example with a plain object shape such as:
- a `status` discriminant
- a success/error branch
- one obvious narrowed property read after the check

**Step 4: Add one short restrictive-helper example**

Keep a small `isString(...)` or `isObject(...)` example with an inline comment showing the narrowed type.

Also add one tiny allowed/disallowed note so the reader sees the restriction before hitting a compiler error.

**Step 5: Commit the new quick start**

Run:
- `git add packages/assert/README.md`
- `git commit -m "Rewrite \`@pvorona/assert\` README quick start"`

---

### Task 3: Add a grouped API map and helper behavior notes

**Files:**
- Modify: `packages/assert/README.md`
- Test: `packages/assert/src/index.ts`
- Test: `packages/assert/src/lib/assert.spec.ts`
- Test: `packages/assert/src/lib/ensureNever.spec.ts`
- Test: `packages/assert/src/lib/ensureNumber.spec.ts`
- Test: `packages/assert/src/lib/ensureNotNullOrUndefined.spec.ts`
- Test: `packages/assert/src/lib/isFunction.spec.ts`
- Test: `packages/assert/src/lib/isNullOrUndefined.spec.ts`
- Test: `packages/assert/src/lib/isNumber.spec.ts`
- Test: `packages/assert/src/lib/isObject.spec.ts`
- Test: `packages/assert/src/lib/isPromiseLike.spec.ts`
- Test: `packages/assert/src/lib/isSymbol.spec.ts`

**Step 1: Add a grouped API reference**

Create a scan-friendly API section with groups such as:
- core assertion helpers
- nullish helpers
- string and number helpers
- object and property helpers
- array helpers
- numeric predicates
- async helper
- public types

List the actual exported names from `packages/assert/src/index.ts`.

**Step 2: Mark what each helper does**

For each entry, say whether it:
- returns a boolean
- narrows a type
- throws on failure

Keep each description to one line.

**Step 3: Add helper-specific caveats**

Document the non-obvious behaviors that the current README misses:
- `ensureNever(...)` has a `silent` flag and throws plain `Error`
- `ensureNumber(...)` is an exception to the blanket restrictive-helper story
- `isNullOrUndefined(...)` and `ensureNotNullOrUndefined(...)` require unions containing both `null` and `undefined`
- `isFunction(...)` is useful for unions that already contain a function member, not plain `unknown`
- `isSymbol(...)` expects the broad `symbol` type in the union
- `isPromiseLike(...)` returns `false` when reading `.then` throws
- `isNumber(...)` excludes `NaN` and infinities
- `isObject(...)` includes arrays but excludes functions

**Step 4: Add one explicit allowed/disallowed snippet**

Use one small snippet that shows:
- an allowed union-narrowing case
- a disallowed case that the package intentionally rejects at compile time

Keep the snippet small enough to support the explanation instead of becoming a new wall of code.

**Step 5: Commit the API reference pass**

Run:
- `git add packages/assert/README.md`
- `git commit -m "Document \`@pvorona/assert\` helper semantics"`

---

### Task 4: Fix the array and public type documentation

**Files:**
- Modify: `packages/assert/README.md`
- Test: `packages/assert/src/lib/isArray.spec.ts`
- Test: `packages/assert/src/lib/ensureArray.spec.ts`
- Test: `packages/assert/src/lib/isEmptyArray.spec.ts`
- Test: `packages/assert/src/lib/isNonEmptyArray.spec.ts`
- Test: `packages/assert/src/lib/ensureNonEmptyArray.spec.ts`

**Step 1: Rewrite the array section heading**

Rename `Non-empty arrays preserve readonlyness` to a broader section that actually matches the public array and type surface.

Use wording that covers:
- `isArray(...)`
- `ensureArray(...)`
- `isEmptyArray(...)`
- `isNonEmptyArray(...)`
- `ensureNonEmptyArray(...)`
- `NonEmptyArray`
- `ReadonlyNonEmptyArray`

**Step 2: Document the readonly contract differences**

Add a short note that:
- `isArray(...)` and `ensureArray(...)` are typed around mutable arrays
- `isEmptyArray(...)`, `isNonEmptyArray(...)`, and `ensureNonEmptyArray(...)` also accept readonly arrays
- narrowing or ensuring a readonly non-empty array preserves readonlyness

**Step 3: Add the missing companion examples**

Add one minimal `isEmptyArray(...)` example that shows the true branch narrows to `[]`.

Add one minimal readonly example that shows `ensureNonEmptyArray(...)` returning `ReadonlyNonEmptyArray<T>` for readonly input.

**Step 4: Document the `map(...)` behavior on public types**

Add one short example showing that:
- `NonEmptyArray` and `ReadonlyNonEmptyArray` preserve non-empty-ness through `map(...)`
- mapping a `ReadonlyNonEmptyArray` returns a mutable `NonEmptyArray`

Spell out that this is why the public types exist, instead of treating them as tuple aliases with no special behavior.

**Step 5: Commit the array/type rewrite**

Run:
- `git add packages/assert/README.md`
- `git commit -m "Clarify \`@pvorona/assert\` array helper docs"`

---

### Task 5: Final verification and polish

**Files:**
- Modify: `packages/assert/README.md`
- Test: `packages/assert/src/index.ts`

**Step 1: Do a final export-to-README sweep**

Compare the README against `packages/assert/src/index.ts` and make sure every public export is either:
- documented in the API map
- covered by an example
- intentionally grouped with a clear one-line description

Remove any wording that still points readers at removed helpers before they understand the current package.

**Step 2: Read the README as a first-time user**

Read the file top-to-bottom and remove:
- repeated caveats
- jargon that the API table already explains
- examples that are longer than the point they teach
- advanced cases that belong in the appendix instead of the main path

**Step 3: Run the available verification**

Run:
- `git diff --check`
- `npm exec nx run @pvorona/assert:test`

Expected:
- `git diff --check` prints no whitespace or merge-marker issues
- `npm exec nx run @pvorona/assert:test` passes if the workspace dependencies are installed

**Step 4: Record blockers honestly**

If `npm exec nx run @pvorona/assert:test` fails because dependencies are missing or because of an unrelated workspace problem, record that explicitly instead of claiming the docs are fully verified.

**Step 5: Commit the final README rewrite**

Run:
- `git add packages/assert/README.md docs/plans/2026-03-06-assert-readme.md`
- `git commit -m "Rewrite \`@pvorona/assert\` README"`
