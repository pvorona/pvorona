# ADR 0004: Split Failure Normalization From Throwable Conversion

- Status: Proposed
- Date: 2026-03-31

## Context

`@pvorona/failable` currently uses one normalization concept for two different
jobs:

1. capture-time normalization in `failable(...)`
2. throw-boundary normalization in `throwIfFailure(...)` and `getOrThrow(...)`

Today, the public API treats both as one `normalizeError` concept:

- `failable(input, NormalizedErrors)` stores `Error` in the failure channel
- `failable(input, { normalizeError })` also stores `Error` in the failure
  channel
- `throwIfFailure(result, normalizeOption?)` converts the stored failure into a
  thrown `Error`
- `result.getOrThrow(normalizeOption?)` does the same

This coupling makes some valid use cases awkward or impossible:

- capturing a thrown or rejected `unknown` value into a domain-specific failure
  type
- keeping the failure channel domain-shaped until a later throw boundary
- expressing "raw capture first, decide how to throw later" as the default flow

The package already has APIs such as `mapError(...)` that suggest these are
separate concerns. The current normalization surface collapses them back
together.

## Intent

Split the pipeline into two explicit conversions:

1. `unknown -> Reason`
   Used by `failable(...)` when capturing thrown or rejected values into the
   `Failure` channel.

2. `Reason -> Error`
   Used only at throw boundaries.

The intended default is:

- `failable(() => value)` captures sync throws into `Failure<unknown>`
- `failable(() => promise)` returns `Failable<Promise<...>, unknown>` and
  treats the promise as ordinary success data
- `await failable(promise)` captures async rejections into `Failure<unknown>`
- `failable(...)` with `toReason` can normalize the captured `unknown` into a
  known domain reason
- `failable(...)` may also accept a constant non-function value as shorthand for
  "ignore the captured value and use this fixed reason"
- `throwIfFailure(...)` and `getOrThrow(...)` always have a built-in default
  `Reason -> Error` normalization
- `throwIfFailure(...)` and `getOrThrow(...)` may still accept an explicit
  `toError` callback when callers want a specific throwable shape or message
- the explicit `toError` callback overload may return either:
  - an `Error`
  - or a `string`, which is used as the message for the produced `Error`

For promise input, the returned value remains `Promise<...>`; this ADR changes
the failure generic, not the async shape.

## Intended Public Direction

The intended behavior is:

```ts
const portResult = failable(() => Number(rawPort));
// Failable<number, unknown>

const configResult = failable(
  () => readConfigFile(),
  (reason) => ({ code: 'invalid_config', cause: reason })
);
// Failable<Config, { readonly code: 'invalid_config'; readonly cause: unknown }>

const responseResult = await failable(fetch(url));
// Failable<Response, unknown>

const pendingResponseResult = failable(() => fetch(url));
// Failable<Promise<Response>, unknown>

const userResult = await failable(fetchUser(), (reason) => ({
  code: 'request_failed',
  cause: reason,
}));
// Failable<User, { readonly code: 'request_failed'; readonly cause: unknown }>

const statusResult = failable(() => readStatus(), 'invalid_status');
// Failable<Status, 'invalid_status'>

const fixedReason = { code: 'invalid_status' } as const;
const richerStatusResult = failable(() => readStatus(), fixedReason);
// Failable<Status, { readonly code: 'invalid_status' }>
```

For throw boundaries:

```ts
declare const userResult: Failable<User, ApiError>;

throwIfFailure(userResult, (reason) => {
  return new Error(`API error: ${reason.code}`, { cause: reason });
});

const user = userResult.data;

const sameUser = userResult.getOrThrow((reason) => {
  return `API error: ${reason.code}`;
});
```

Zero-arg throw helpers continue to work for any reason type through the default
normalization path:

```ts
declare const userResult: Failable<User, ApiError>;

throwIfFailure(userResult);
const user = userResult.getOrThrow();
```

If the failure channel is already `Error`, the default path preserves the
stored error unchanged:

```ts
declare const userResult: Failable<User, Error>;

throwIfFailure(userResult);
const user = userResult.getOrThrow();
```

The `configResult` example above does not require an explicit return type
annotation. If the capture overload uses a `const` generic for the normalized
reason, TypeScript can preserve narrow discriminants for inline mapper results
instead of widening them to `string`.

That helps preserve shapes such as:

```ts
{ readonly code: 'invalid_config'; readonly cause: unknown }
```

However, that is still a narrow anonymous structural type, not a named alias
such as `ConfigError`.

Constant non-function values are intended as shorthand for cases where the
captured `unknown` reason is not needed:

```ts
const statusResult = failable(() => readStatus(), 'invalid_status');
```

Conceptually that is equivalent to:

```ts
const fixedReason = 'invalid_status' as const;

const statusResult = failable(
  () => readStatus(),
  () => fixedReason
);
```

This shorthand is intentionally lossy. It discards the original captured
`unknown` value instead of preserving it inside the stored reason.

## Resolved Directions

### Public API Names

Use:

- `toReason` for capture-time `unknown -> Reason` normalization
- `toError` for throw-boundary customization that may return either:
  - an `Error`
  - or a `string` message that becomes an `Error`

### Bare Function Arguments

Use bare functions for the second argument shape:

```ts
failable(promise, toReason);
result.getOrThrow(toError);
```

Do not use named options objects such as:

```ts
failable(promise, { toReason });
result.getOrThrow({ toError });
```

Rationale:

- the mapper is the whole second argument, not one field among many
- bare functions keep the call sites compact
- if the capture overload uses a `const` generic for the normalized reason,
  bare function mappers preserve narrow inline discriminants well

### Constant Value Shorthand

Allow constant non-function values as shorthand for capture-time normalization
when the original reason is intentionally ignored.

Examples:

```ts
failable(() => readStatus(), 'invalid_status');
failable(fetchUser(), 503);
failable(fetchUser(), { code: 'request_failed' } as const);
```

This shorthand is equivalent to a constant `toReason` mapper and is
intentionally lossy.

Enums and enum members should be treated as ordinary values under this rule.
They do not need special-case API treatment.

### Existing Result Inputs And Passthrough Values

Preserve or rehydrate existing result values:

- `Success`
- `Failure`
- `Failable`
- `FailableLike`

Do not allow a second argument when `failable(...)` is called with any of those
values directly, or when a callback returns them, or when a promise resolves to
them.

Examples:

```ts
const existingFailure = failure('boom');
const existingWire = { status: FailableStatus.Failure, error: 'boom' } as const;

failable(existingFailure);
// valid

failable(existingWire);
// valid

failable(() => existingFailure);
// valid

await failable(Promise.resolve(existingWire));
// valid

failable(existingFailure, (reason) => ({ code: 'wrapped', cause: reason }));
// invalid

failable(
  () => existingFailure,
  (reason) => ({ code: 'wrapped', cause: reason })
);
// invalid

failable(Promise.resolve(existingWire), (reason) => ({
  code: 'wrapped',
  cause: reason,
}));
// invalid
```

Rationale:

- these values are already result-shaped
- `toReason` is for capture-time conversion from `unknown`
- allowing a second argument here would blur capture-time normalization with
  later result rehydration or failure-channel transformation

### Existing Hydrated `Failable` Inputs

Do not allow a second argument when `failable(...)` is called with an existing
hydrated `Failable`.

Examples:

```ts
const existing = failure('boom');

failable(existing);
// valid

failable(existing, (reason) => ({ code: 'wrapped', cause: reason }));
// invalid
```

Rationale:

- `toReason` is for capture-time conversion from `unknown`
- an existing hydrated `Failable` is already past the capture boundary
- allowing a second argument here would blur capture-time normalization with
  later failure-channel transformation

### Existing `FailableLike` Inputs

Do not allow a second argument when `failable(...)` is called with a
`FailableLike`.

Examples:

```ts
const existing = { status: FailableStatus.Failure, error: 'boom' } as const;

failable(existing);
// valid

failable(existing, (reason) => ({ code: 'wrapped', cause: reason }));
// invalid
```

Rationale:

- `FailableLike` is already a transport form of an existing result
- `toReason` is for capture-time conversion from `unknown`
- allowing a second argument here would turn rehydration into an additional
  failure-channel transformation step

### Promise-Returning Callback Values

Do not treat promise-returning callbacks as misuse.

Examples:

```ts
const pendingResponseResult = failable(() => fetch(url));
// Failable<Promise<Response>, unknown>
```

Rationale:

- `failable(() => ...)` is a synchronous throw boundary
- if the callback synchronously returns a promise, that promise is ordinary
  returned data
- async rejection capture remains the job of `await failable(promise)`

### Default Throw-Boundary Normalization

`throwIfFailure(result)` and `result.getOrThrow()` must keep a built-in default
`Reason -> Error` normalization.

Explicit `toError` customization is optional, not a required
argument for non-`Error` reasons.

By default:

- if the stored reason is already an `Error`, preserve it unchanged
- otherwise produce an `Error` with message:
  - `Expected value to be Success. Received Failure(${String(reason)}).`

When provided, `toError` must support two overload shapes:

- `Reason -> Error`
- `Reason -> string`

If `toError` returns a string, that string becomes the message of the produced
`Error`.

### Recommended Bridge To Throwable Form

Prefer:

```ts
result.getOrThrow(toError);
```

at unwrap boundaries.

Prefer:

```ts
result.mapError((reason) => new Error(`...`, { cause: reason }));
```

when the caller wants to convert the failure channel to `Error` but does not
need to unwrap immediately.

This keeps the guidance aligned with intent:

- `getOrThrow(...)` is the boundary helper
- `mapError(...)` is the channel-transformation helper
- string-returning `toError` overloads are specific to throwable APIs, not the
  general `mapError(...)` guidance

### Release Strategy

This lands as a breaking change.

### `NormalizedErrors`

Remove `NormalizedErrors` entirely.

The split does not leave one remaining preset that cleanly spans both
capture-time `toReason` and throw-boundary `toError` behavior.

## Non-Goals

This ADR does not intend to:

- allow `throwIfFailure(...)` or `getOrThrow(...)` to throw arbitrary non-Error
  values
- change the runtime `Success` / `Failure` model
- change `run(...)`, `all(...)`, `allSettled(...)`, or `race(...)`
- require callers to normalize all failures eagerly at capture time

## Why Make This Split

### 1. `failable(...)` becomes a clearer capture API

Without a second argument, `failable(...)` keeps the raw thrown or rejected
value in the failure channel as `unknown`.

That makes the default meaning straightforward:

- capture the boundary
- do not silently choose a domain shape yet

### 2. Domain failures become first-class

Callers can normalize `unknown` into a domain-specific reason without being
forced to store `Error`.

Examples:

- `{ code: 'invalid_json', cause: unknown }`
- `{ code: 'network_unavailable'; retryAfterMs?: number }`
- `ConfigError`
- `ApiError`

### 3. Throw boundaries stay explicitly throwable

Throwing remains a separate step that must end with `Error`.

That keeps the package aligned with normal JavaScript and Node expectations:

- stack traces stay attached to `Error`
- consumer code can continue to assume thrown values are `Error`
- `catch` blocks remain interoperable with ordinary `Error` handling

### 4. The API matches the control-flow model better

`Failure<Reason>` is about domain control flow.

Throwing is an escape hatch out of that flow.

Those are related operations, but they are not the same operation.

## Consequences If Accepted

### Positive

- `failable(...)` can produce domain-specific failure types.
- terse fixed-value capture becomes possible when callers do not care about the
  original thrown or rejected value
- The default `failable(...)` contract becomes "raw capture" instead of
  "capture plus implicit throwable normalization."
- Throw-boundary behavior becomes explicit instead of hidden inside the same
  option type used for capture.
- `mapError(...)` becomes a clearer adjacent tool for converting domain failures
  before throwing.
- Generic code can distinguish "store a reason" from "throw an error."

### Negative

- This is a breaking API change.
- `failable(() => promise)` no longer reports misuse and instead stores the
  returned promise as ordinary success data.
- Helpers that currently accept `Failable<T, E>` and call `throwIfFailure(...)`
  would no longer need to constrain `E extends Error`, but they may still want
  an optional custom `toError` hook when they need a domain-specific
  throwable shape or custom message.
- The default `Reason -> Error` normalization must now be documented and kept
  stable as part of the throw-helper contract.
- There is still an API surface change if custom throw-boundary mapping is
  renamed or split away from capture-time normalization.
- constant-value shorthand is intentionally lossy and therefore unsuitable when
  callers want the original cause preserved inside the stored reason
- README examples and public-surface tests would need significant updates.
