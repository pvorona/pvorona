# `@pvorona/failable` function-first API design (2026-03-04)

## Goal

Expose a **function-first** runtime API for `@pvorona/failable` by removing the namespace-style runtime export `Failable`, while preserving the existing runtime model (frozen prototype objects tagged with Symbols).

## Public API (exports)

### Kept (types / consts)

- `export const enum FailableStatus`
- `export type Failable<T, E> = Success<T> | Failure<E>`
- `export type Success<T>`
- `export type Failure<E>`
- `export type FailableLike<...>` (and related types)

### Removed (runtime)

- `export const Failable = { ... } as const`

### Added (named function exports)

- `export function success<T = void>(data: T): Success<T>`
- `export function failure<E = void>(error: E): Failure<E>`
- `export function createFailable(...)` (same overload/behavior as the old `from(...)`)
- `export function isFailable(value: unknown): value is Failable<unknown, unknown>`
- `export function isSuccess(value: unknown): value is Success<unknown>`
- `export function isFailure(value: unknown): value is Failure<unknown>`
- `export function toFailableLike(...)` (same overloads/behavior as the current helper)
- `export function isFailableLike(value: unknown): value is FailableLike<unknown, unknown>`

## Behavior (unchanged)

`createFailable(...)` preserves the behavior of the old `Failable.from(...)`:

- If input is already a hydrated `Failable`, return it.
- If input is a `FailableLike`, rehydrate.
- If input is a function, capture throws into a failure.
- Otherwise treat as a promise and capture rejections into a failure.

## Breaking change

This is a **breaking** export-surface change:

- The runtime `Failable` namespace object is removed.
- Call sites must switch to named imports (`success`, `failure`, `createFailable`, guards, utilities).

## Migration mapping

- `Failable.ofSuccess(x)` → `success(x)`
- `Failable.ofError(e)` → `failure(e)`
- `Failable.from(v)` → `createFailable(v)`
- `Failable.isSuccess(v)` → `isSuccess(v)` (same for `isFailure`, `isFailable`, `isFailableLike`)
- `Failable.toFailableLike(r)` → `toFailableLike(r)`

