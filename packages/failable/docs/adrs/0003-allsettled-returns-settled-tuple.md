# ADR 0003: Return A Plain Settled Tuple From `allSettled(...)`

- Status: Accepted
- Date: 2026-03-22

## Context

`@pvorona/failable` exposes `allSettled(...)` as the combinator that waits for
every source and preserves each source result instead of short-circuiting on the
first failure.

After the rejection-capture change, the valid runtime contract is:

- fulfilled `Success` sources stay `Success`
- fulfilled `Failure` sources stay `Failure`
- rejected promised sources become raw `Failure` values

That means `allSettled(...)` no longer has its own failure channel for valid
inputs. It always produces a settled tuple of `Failable` entries.

This left a design question:

- should `allSettled(...)` still return `Success<[...]>`
- or should it return the settled tuple directly

## Options Considered

### 1. Keep returning `Success<tuple>`

Example:

```ts
const settled = await allSettled(p1, p2);

if (settled.isFailure) {
  // unreachable for valid inputs
}

const [left, right] = settled.data;
```

Inside `run(...)` this also allowed:

```ts
const [left, right] = yield * (await allSettled(p1, p2));
```

Benefits:

- keeps top-level combinators in the `Failable` family
- composes with `yield*` inside async `run(...)` builders
- preserves API consistency with helpers that genuinely can fail

Costs:

- the wrapper communicates no useful information because `allSettled(...)`
  itself does not fail for valid inputs
- callers have to unwrap a guaranteed `Success` to reach the actual settled
  tuple
- docs and tests become more verbose for no semantic gain
- it makes the return type look more complex than the behavior actually is

### 2. Return the settled tuple directly

Example:

```ts
const [left, right] = await allSettled(p1, p2);
```

Inside `run(...)` this becomes:

```ts
const [left, right] = await allSettled(p1, p2);
```

Benefits:

- matches the real behavior: the combinator settles to a tuple and does not
  produce its own failure wrapper
- removes unnecessary ceremony outside `run(...)`
- makes the API easier to read, teach, and type-check
- is closer to the mental model of `Promise.allSettled(...)` while still using
  `Success` / `Failure` for each entry

Costs:

- `allSettled(...)` is less uniform with `all(...)` and `race(...)`
- async `run(...)` builders use plain `await allSettled(...)` instead of
  `yield* await allSettled(...)`

### 3. Return native `Promise.allSettled(...)` result objects

Example:

```ts
const settled = await allSettled(p1, p2);
// [{ status: 'fulfilled', value: ... }, { status: 'rejected', reason: ... }]
```

Benefits:

- very familiar JavaScript shape

Costs:

- introduces a second result vocabulary next to `Success` / `Failure`
- throws away the package's existing result helpers and narrowing patterns
- makes `allSettled(...)` feel like an escape hatch out of the `Failable` model

We rejected this because it is a poor fit for the package.

## Decision

`allSettled(...)` returns the settled tuple directly.

The accepted public contract is:

- sync inputs -> settled tuple
- async inputs -> `Promise<settled tuple>`
- each tuple slot is still a `Success` or `Failure`
- promised source rejections are captured as raw `Failure` values
- best-effort type guardrails for obvious bare `Promise.reject(...)` inputs stay
  in place

For async `run(...)` builders, `allSettled(...)` is consumed with ordinary
`await`, not `yield* await`.

## Consequences

### Positive

- The return type now matches the behavior.
- Normal call sites are simpler.
- The README and public-surface tests are easier to understand.
- `allSettled(...)` is closer to what users expect from its name.

### Negative

- The combinator family is less uniform.
- `allSettled(...)` no longer participates in direct `yield*` composition in
  async `run(...)` builders.

### Follow-Up

If more combinators end up with "cannot fail" semantics, prefer returning the
plain value instead of wrapping it in `Success<...>` unless the wrapper carries
meaningful information for callers.
