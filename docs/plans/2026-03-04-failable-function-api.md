# `@pvorona/failable` function API implementation plan (2026-03-04)

## Goal

Remove the namespace-style runtime export `Failable` and expose a function-first API, renaming `from` to `createFailable`, then bump versions and publish to npmjs.

## Architecture constraints

- Keep the existing runtime model (frozen prototype objects tagged with Symbols).
- Only the **export surface** changes: move factories/guards/utilities from `Failable.<method>` to top-level named exports, and rename `from(...)` → `createFailable(...)`.

## Target API (public exports)

From `packages/failable/src/lib/failable.ts`:

- Keep existing types/consts:
  - `export const enum FailableStatus`
  - `export type Failable<T, E> = Success<T> | Failure<E>`
  - `export type Success<T>`, `export type Failure<E>`
  - `export type FailableLike<...>` and friends
- Remove:
  - `export const Failable = { ... } as const`
- Add named exports (top-level):
  - `export function success<T = void>(data: T): Success<T>`
  - `export function failure<E = void>(error: E): Failure<E>`
  - `export function createFailable(...)` with the same overload behavior as current `from(...)`
  - `export function isFailable(value: unknown): value is Failable<unknown, unknown>`
  - `export function isSuccess(value: unknown): value is Success<unknown>`
  - `export function isFailure(value: unknown): value is Failure<unknown>`
  - `export function toFailableLike(...)` (same overloads as current helper)
  - `export function isFailableLike(value: unknown): value is FailableLike<unknown, unknown>`

Migration mapping:

- `Failable.ofSuccess(x)` → `success(x)`
- `Failable.ofError(e)` → `failure(e)`
- `Failable.from(v)` → `createFailable(v)`
- `Failable.isSuccess(v)` → `isSuccess(v)` (same for `isFailure`, `isFailable`, `isFailableLike`)
- `Failable.toFailableLike(r)` → `toFailableLike(r)`

---

## Task 0: Capture the design + plan in-repo (docs-only)

Files:

- Create: `docs/plans/2026-03-04-failable-function-api-design.md`
- Create: `docs/plans/2026-03-04-failable-function-api.md`

Steps:

- Ensure `docs/plans` exists: `mkdir -p docs/plans`
- Write the design doc (exports, rename `from` → `createFailable`, migration mapping, breaking-change note)
- Write this implementation plan doc
- Commit:
  - `git add docs/plans/2026-03-04-failable-function-api-design.md docs/plans/2026-03-04-failable-function-api.md`
  - `git commit -m "Add plan for @pvorona/failable function API"`

---

## Task 1: Make `@pvorona/failable` tests expect the new API

Files:

- Modify: `packages/failable/src/lib/failable.spec.ts`
- Modify: `packages/failable/src/lib/failable.structuredClone.spec.ts`

Steps:

- Update imports to function exports (replace `Failable` import with `success`, `failure`, `createFailable`, `isFailable`, `isSuccess`, `isFailure`, `toFailableLike`, `isFailableLike`)
- Update call sites:
  - `Failable.ofSuccess(...)` → `success(...)`
  - `Failable.ofError(...)` → `failure(...)`
  - `Failable.from(...)` → `createFailable(...)`
  - Guard/util calls similarly
- Run tests to confirm they fail (expected):
  - `npx nx test @pvorona/failable`
- Commit (tests-first checkpoint):
  - `git add packages/failable/src/lib/failable.spec.ts packages/failable/src/lib/failable.structuredClone.spec.ts`
  - `git commit -m "Update @pvorona/failable tests for function API"`

---

## Task 2: Replace `export const Failable` with function exports in implementation

Files:

- Modify: `packages/failable/src/lib/failable.ts`

Steps:

- Introduce exported function declarations (hoisted `export function ...` preferred):
  - `success`
  - `failure`
- Update internal references away from `Failable`:
  - In `BASE_FAILURE.or`, replace `Failable.ofSuccess(value)` with `success(value)`
  - In `fromFailableLike`, replace `Failable.ofSuccess(...)` / `Failable.ofError(...)` with `success(...)` / `failure(...)`
  - Replace `Failable.isFailable(...)` and `Failable.isFailableLike(...)` with `isFailable(...)` and `isFailableLike(...)`
- Rename `from(...)` → `createFailable(...)` (keep overload behavior)
- Export utilities directly:
  - `toFailableLike`
  - `isFailableLike`
  - `isFailable` / `isSuccess` / `isFailure`
- Delete the namespace object export:
  - Remove `export const Failable = { ... } as const;`
- Run tests (expected pass):
  - `npx nx test @pvorona/failable`
- Commit:
  - `git add packages/failable/src/lib/failable.ts`
  - `git commit -m "Remove Failable namespace export from @pvorona/failable"`

---

## Task 3: Update `@pvorona/failable` README to match new API

Files:

- Modify: `packages/failable/README.md`

Steps:

- Update all examples:
  - `import { Failable } from '@pvorona/failable'` → named imports
  - `Failable.from` → `createFailable`
  - `Failable.ofSuccess/ofError` → `success/failure`
- Update API section headings (replace `### const Failable` with function sections)
- Run:
  - `npx nx test @pvorona/failable`
- Commit:
  - `git add packages/failable/README.md`
  - `git commit -m "Update @pvorona/failable README for function API"`

---

## Task 4: Migrate `@pvorona/disposable` to the new failable API

Files:

- Modify: `packages/disposable/src/lib/disposable.ts`
- Modify: `packages/disposable/src/lib/disposable.spec.ts`

Steps:

- Update imports in `disposable.ts`:
  - Replace `import { Failable } from '@pvorona/failable';`
  - Replace `import type { Failable as FailableType } from '@pvorona/failable';`
  - With:
    - `import { success, failure } from '@pvorona/failable';`
    - `import type { Failable } from '@pvorona/failable';`
- Update implementation call sites:
  - `Failable.ofSuccess(null)` → `success(null)`
  - `Failable.ofError(...)` → `failure(...)`
- Update tests:
  - Replace `Failable.isSuccess(...)` → `isSuccess(...)` (and similarly for failure)
- Run:
  - `npx nx test @pvorona/disposable`
- Commit:
  - `git add packages/disposable/src/lib/disposable.ts packages/disposable/src/lib/disposable.spec.ts`
  - `git commit -m "Update @pvorona/disposable to use @pvorona/failable function API"`

---

## Task 5: Verification + cleanup

Steps:

- Ensure no remaining namespace usage:
  - Search for `Failable.` and fix any stragglers (excluding `женя/`)
- Build + typecheck:
  - `npx nx build @pvorona/failable`
  - `npx nx typecheck @pvorona/failable`
  - `npx nx build @pvorona/disposable`
  - `npx nx typecheck @pvorona/disposable`
- Workspace package audit:
  - `node tools/package-audit/check-workspace-packages.mjs`
- `git status` should be clean

---

## Task 6: Bump versions + update dependency range (publish prep)

Files:

- Modify: `packages/failable/package.json`
- Modify: `packages/disposable/package.json`
- Modify: `package-lock.json`

Steps:

- Bump `@pvorona/failable` to `0.1.0`
- Bump `@pvorona/disposable` to `0.0.4` and update `@pvorona/failable` dependency range to `~0.1.0`
- Update lockfile:
  - `npm install`
- Verify:
  - `npx nx run-many -t lint test build typecheck --projects=@pvorona/failable,@pvorona/disposable`
- Commit:
  - `git add packages/failable/package.json packages/disposable/package.json package-lock.json`
  - `git commit -m "Bump @pvorona/failable to 0.1.0 and update dependents"`

---

## Task 7: Publish to npmjs

Steps:

- Confirm npm auth + registry:
  - `npm whoami`
  - `npm config get registry` (expect `https://registry.npmjs.org/`)
- Publish:
  - `cd packages/failable && npm publish --access public`
  - `cd packages/disposable && npm publish --access public`
- Optional: `git push`

