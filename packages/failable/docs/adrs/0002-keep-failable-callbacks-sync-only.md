# ADR 0002: Keep `failable(() => ...)` Callbacks Sync-Only

- Status: Accepted
- Date: 2026-03-22

## Context

`@pvorona/failable` originally treated callback capture as a synchronous throw
boundary:

```ts
const parsed = failable(() => JSON.parse(text));
```

Async rejection capture used the direct promise form:

```ts
const response = await failable(fetch(url));
```

Commit `5579285f` expanded `failable(() => ...)` to also accept callbacks that
return a `PromiseLike`, including `async` functions.

At runtime, this seemed attractive because it let one API capture both:

- sync throws from callbacks
- async rejections from promise-returning callbacks

In practice, the combined design created significant DX and maintenance costs.

## Problems Encountered

### 1. The return type became branchy in common code

When `failable(() => ...)` may receive either a sync or async callback result,
the returned shape must follow that same runtime branch:

- sync callback result -> `Failable<T, E>`
- promise-returning callback result -> `Promise<Failable<T, E>>`

That makes callbacks typed as `any`, `unknown`, or `T | Promise<T>` surface as:

```ts
Failable<T, E> | Promise<Failable<T, E>>;
```

This is type-systemically correct, but unpleasant in normal use.

Common boundaries such as `JSON.parse(...)` stopped feeling straightforward,
because users had to write patterns like:

```ts
await Promise.resolve(failable(() => JSON.parse(text)));
```

or reshape the callback body just to keep the result synchronous.

The main "catch throws for me" helper became harder to use precisely at the
simple boundaries where it should feel most natural.

### 2. TypeScript could not hide the ambiguity soundly

The problem was not a missing conditional type trick. It came from the runtime
contract itself.

As long as `failable(() => ...)` decided between sync and async behavior based
on the callback's return value, TypeScript had to preserve that uncertainty for
ambiguous callback types.

This meant the API looked simple at first glance, but leaked a substantial
amount of type machinery into callers and public-surface tests.

### 3. Documentation and examples became harder to teach

The package had to explain special rules for:

- sync callbacks
- async callbacks
- direct promises
- callbacks whose apparent return type was ambiguous
- `any` / `unknown` call sites

This made README guidance longer and less intuitive than the underlying
concepts deserved.

Instead of teaching one clean rule for sync throw capture and one clean rule for
async rejection capture, the docs had to explain when a callback did or did not
become promise-like.

### 4. Runtime misuse still needed a guard path

Even with TypeScript restrictions, JS callers and loosely typed callbacks could
still return a promise at runtime.

That forced the implementation to choose a misuse behavior anyway:

- silently accept promise-returning callbacks
- or fail with actionable guidance

Once we accepted that a guard path was still necessary for unsafe callers, the
benefit of auto-converting async callbacks became smaller than the complexity it
introduced for safe callers.

### 5. The async callback form duplicated an already clear async entry point

The package already had a direct async capture API:

```ts
await failable(promise);
```

That form is explicit about the async boundary and does not require any sync vs
async callback inference.

Supporting promise-returning callbacks in `failable(() => ...)` did not unlock a
new capability. It introduced a second, more ambiguous spelling for the same
async outcome.

## Options Considered

### 1. Keep auto-detecting sync vs async callback returns

This preserved the broader API surface, but also preserved:

- union-heavy return types in ambiguous cases
- more complex docs
- more complex consumer tests
- more surprising behavior around `any` / `unknown`

We rejected this because it optimized for flexibility over clarity in the most
common call sites.

### 2. Make callback capture always async

Under this model, `failable(() => value)` would always return
`Promise<Failable<...>>`.

This would simplify the rule, but it would make synchronous use heavier and
would turn a lightweight helper into an async-first API. That is a poor fit for
common throw boundaries like parsing, decoding, and validation.

We rejected this because it regresses the ergonomic sync case.

### 3. Keep callbacks sync-only and use direct promises for async capture

Under this model:

- `failable(() => value)` captures synchronous throws
- `await failable(promise)` captures async rejections

This restores a clear distinction between sync and async boundaries and avoids
runtime-shape ambiguity for callback capture.

We accepted this option.

## Decision

`failable(() => ...)` remains a synchronous callback boundary only.

The accepted public contract is:

- use `failable(() => value)` for synchronous code that may throw
- use `await failable(promise)` for asynchronous work that may reject
- reject obviously promise-returning callbacks at the type level
- if a JS or unsafely typed callback returns a promise at runtime, return a
  `Failure<Error>` with guidance to pass the promise directly instead

The undo of async callback support was applied in commit `0198812c`.

## Consequences

### Positive

- Common sync boundaries are simple again.
- `any`, `unknown`, and `T | Promise<T>` callbacks no longer force a
  `Failable | Promise<Failable>` result.
- The README can teach two clear rules instead of a branching callback model.
- Public-surface and consumer tests are easier to understand and maintain.
- The async boundary is explicit at the call site.

### Negative

- Promise-returning callbacks no longer work as a supported `failable(() => ...)`
  pattern.
- Callers must pass the promise directly for async capture.

### Follow-Up

If the package later needs a more explicit async callback helper, it should be
introduced as a separate API such as `failableAsync(...)`, rather than
reintroducing runtime auto-detection into `failable(() => ...)`.
