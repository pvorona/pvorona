# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

`Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`. In normal application code, return `success(...)` / `failure(...)`, then branch with `result.isSuccess` / `result.isError` on that local result. Reserve `isSuccess(...)` / `isFailure(...)` for validating hydrated values that arrive as `unknown`, and use `isFailableLike(...)` for plain transport shapes.

## Install

```bash
npm i @pvorona/failable
```

This package is ESM-only. Use `import` syntax; the published package declares `Node >=18`.

## Quick Start

```ts
import type { Failable } from '@pvorona/failable';
import { failure, success } from '@pvorona/failable';

function divide(a: number, b: number): Failable<number, string> {
  if (b === 0) return failure('Cannot divide by zero');

  return success(a / b);
}

const result = divide(10, 2);

if (result.isError) {
  console.error(result.error);
} else {
  console.log(result.data);
}
```

## Everyday Usage

### Quick chooser

- Use `createFailable(() => ...)` when the boundary is synchronous code that might throw.
- Use `await createFailable(promise)` when the boundary is async code that might reject.
- Use `run(...)` when each step already returns `Failable` and you want to compose the happy path.
- Use `throwIfError(result)` when you want to keep using the same `result` variable after narrowing.
- Use `result.getOrThrow()` when you want the success value itself in expression or return position.

### Return `success(...)` and `failure(...)`

Use the explicit constructors when your function already knows which branch it should return:

```ts
import { failure, success } from '@pvorona/failable';

const ok = success({ id: '1' });
const err = failure({ code: 'bad_request' });
```

### Branch and unwrap with helpers

Hydrated `Failable` values carry booleans and convenience methods. Start with ordinary branching on the result, then pick the helper that matches how you want to unwrap:

```ts
import { failure, success } from '@pvorona/failable';

const portResult = Math.random() > 0.5
  ? success(3000)
  : failure('Missing port');

if (portResult.isError) {
  console.error(portResult.error);
} else {
  console.log(portResult.data);
}

const port = portResult.getOr(3000);
const ensuredPort = portResult.or(3000);
console.log(port, ensuredPort.data);
```

- `result.isSuccess` / `result.isError`: branch on a hydrated result
- `result.getOr(fallback)`: eagerly get the success value or a fallback
- `result.getOrElse(() => fallback)`: lazily compute a fallback value only on failure
- `result.or(fallback)`: eagerly recover to a `Success` result
- `result.orElse(() => fallback)`: lazily recover to a `Success` result only on failure
- `result.match(onSuccess, onFailure)`: map both branches to one output type
- `throwIfError(result)`: throw the stored failure unchanged and keep using the same result on success
- `result.getOrThrow()`: unwrap success as a value or throw the stored failure unchanged

Use `throwIfError(result)` when you want to keep the same result variable and continue with narrowed access to `result.data`:

```ts
import {
  failure,
  success,
  throwIfError,
  type Failable,
} from '@pvorona/failable';

const portResult: Failable<number, string> = Math.random() > 0.5
  ? success(3000)
  : failure('Missing port');

throwIfError(portResult);
console.log(portResult.data);
```

Use `getOrThrow()` when you want the success value itself in expression or return position:

```ts
const requiredPort = portResult.getOrThrow();
console.log(requiredPort);
```

Use the lazy forms when the fallback is expensive or has side effects:

```ts
import { failure, success } from '@pvorona/failable';

function readFallbackPort() {
  console.log('Reading fallback port from disk');
  return 3000;
}

const portResult = Math.random() > 0.5
  ? success(8080)
  : failure('Missing port');

const eagerPort = portResult.getOr(readFallbackPort());
const lazyPort = portResult.getOrElse(() => readFallbackPort());
const ensuredPort = portResult.orElse(() => readFallbackPort());

console.log(eagerPort, lazyPort, ensuredPort.data);
```

`readFallbackPort()` runs before `getOr(...)` because the fallback expression is evaluated eagerly. With `getOrElse(...)` and `orElse(...)`, the callback runs only if the result is a failure.

`match(...)` is often clearer than a fallback when both branches need real handling:

```ts
import { failure, success } from '@pvorona/failable';

const portResult = Math.random() > 0.5
  ? success(3000)
  : failure('Missing port');

const status = portResult.match(
  (port) => `Listening on ${port}`,
  (error) => `Cannot start server: ${error}`
);
```

### `createFailable(...)` for throwy or rejecting code

`createFailable(...)` is the boundary helper for non-`Failable` code. Use it when you need to capture sync throws, promise rejections, or rehydrate an existing result shape. Unlike `run(...)`, it is not for `Failable`-to-`Failable` composition:

- `createFailable(failable)` returns the same tagged hydrated instance
- `createFailable(failableLike)` rehydrates a strict wire shape into a real `Success` / `Failure`
- `createFailable(() => value)` captures synchronous throws into `Failure`
- `createFailable(promise)` captures async rejections into `Failure`
- If a callback returns, or a promise resolves to, a `Failable` or `FailableLike`, `createFailable(...)` preserves that result instead of nesting it inside `Success`

Plain lookalike objects are not treated as hydrated `Failable` instances. If you have plain `{ status, data }` or `{ status, error }` transport data, validate it with `isFailableLike(...)` or pass it to `createFailable(...)` to rehydrate before calling instance methods.

If a helper already returns `Failable`, branch on it directly or compose it with `run(...)` instead of wrapping it again with `createFailable(...)`.

```ts
import {
  createFailable,
  failure,
  success,
  type Failable,
} from '@pvorona/failable';

type PortError = {
  readonly code: 'invalid_port';
};

function readPort(value: unknown): Failable<number, PortError> {
  if (typeof value !== 'number') return failure({ code: 'invalid_port' });

  return success(value);
}

const configResult = createFailable(() => JSON.parse(rawConfig));

if (configResult.isError) {
  console.error('Invalid JSON:', configResult.error);
} else {
  const portResult = readPort(configResult.data.port);

  if (portResult.isError) {
    console.error(portResult.error.code);
  } else {
    console.log(portResult.data);
  }
}
```

Pass promises directly when you want rejection capture:

```ts
import { createFailable } from '@pvorona/failable';

const responseResult = await createFailable(fetch(url));
if (responseResult.isError) console.error(responseResult.error);
```

`createFailable(() => promise)` is not the supported API. In TypeScript, obviously promise-returning callbacks such as `async () => ...` and `() => Promise.resolve(...)` are rejected. JS callers, plus `any`/`unknown`-typed callbacks, still rely on the runtime guard; those cases stay in the failure channel as an `Error` telling you to pass the promise directly instead. That guard error is preserved even when you pass a custom `normalizeError`.

### `run(...)` for `Failable` composition

Use `run(...)` when each step already returns `Failable` and you want the happy path to read top-down. Inside both the sync and async builder forms, use `yield* get(result)` to unwrap success values. The mental model is simple: success values keep flowing forward, and the first yielded `Failure` short-circuits with that same `Failure` instance.

```ts
import { failure, run, success, type Failable } from '@pvorona/failable';

function divide(a: number, b: number): Failable<number, string> {
  if (b === 0) return failure('Cannot divide by zero');

  return success(a / b);
}

const result = run(function* ({ get }) {
  const first = yield* get(divide(20, 2));
  const second = yield* get(divide(first, 5));

  return success(second);
});

if (result.isError) {
  console.error(result.error);
} else {
  console.log(result.data); // 2
}
```

Async builders use the same composition pattern. Keep using `yield* get(...)`; do not switch to `await get(...)`:

```ts
import { failure, run, success, type Failable } from '@pvorona/failable';

function divide(a: number, b: number): Failable<number, string> {
  if (b === 0) return failure('Cannot divide by zero');

  return success(a / b);
}

async function divideAsync(
  a: number,
  b: number,
): Promise<Failable<number, string>> {
  return divide(a, b);
}

const result = await run(async function* ({ get }) {
  const first = yield* get(divide(20, 2));
  const second = yield* get(divideAsync(first, 5));

  return success(second);
});

if (result.isError) {
  console.error(result.error);
} else {
  console.log(result.data); // 2
}
```

Important `run(...)` rules:

- Use `run(...)` for `Failable`-to-`Failable` composition. Use `createFailable(...)` when you need to capture sync throws, promise rejections, or rehydrate a `FailableLike`.
- In async builders, keep using `yield* get(...)`. Do not write `await get(...)`.
- `get(...)` accepts `Failable` sources in both modes and `PromiseLike<Failable>` sources in async builders only.
- Use `yield* get(failable)` inside the callback. Other interaction with `get` internals is unsupported and not part of the API contract.
- `get` exists only inside the generator callback; it is not a public export.
- Return `success(...)`, `failure(...)`, or another `Failable`. An empty generator or bare `return` becomes `Success<void>`, but raw return values are rejected.
- Throwing inside the generator is not converted into `Failure`, and rejected promised sources are not converted into `Failure`; foreign exceptions and rejections escape unchanged.
- Rare cleanup edge cases: cleanup `yield* get(...)` steps unwind before a yielded `Failure` returns, cleanup `Failure`s preserve the original `Failure` while outer `finally` blocks keep unwinding, and promised source rejections still unwind managed cleanup before rejecting. Direct `throw`s inside `finally` are outside that managed cleanup and can replace the in-flight failure or rejection.

### Use guards for `unknown` values

Use `isFailable(...)`, `isSuccess(...)`, and `isFailure(...)` when you start from `unknown` and need to validate something that might already be a hydrated `Failable` instance. If you already have a local result from your own code, keep branching with `result.isSuccess` / `result.isError` instead of re-validating it with top-level guards:

```ts
import { isFailable } from '@pvorona/failable';

const candidate: unknown = maybeFromAnotherModule();

if (isFailable(candidate) && candidate.isError) {
  console.error(candidate.error);
}
```

These guards only recognize tagged hydrated instances created by `success(...)`, `failure(...)`, or `createFailable(...)`. Plain objects that merely look similar are not enough.

Use `isSuccess(...)` / `isFailure(...)` when you only care about one branch. If you are validating plain wire data, use `isFailableLike(...)` and then rehydrate with `createFailable(...)` before calling instance methods.

## Important Semantics

- Hydrated `Failable` values are frozen plain objects with methods. Prefer `result.isSuccess` / `result.isError`, and do not use `instanceof`.
- `run(...)` supports both `function*` and `async function*` builders. In both forms, use `yield* get(...)`; async builders still do not use `await get(...)`.
- `run(...)` short-circuits on the first yielded failure, preserves that original `Failure` instance unchanged, and enters `finally` cleanup before returning. Cleanup keeps unwinding while cleanup `yield* get(...)` steps succeed. Cleanup `Failure`s preserve the original `Failure` and continue into outer `finally` blocks, while promised cleanup rejections still escape unchanged.
- In async builders, promised `get(...)` source rejections still escape unchanged after managed `yield* get(...)` cleanup unwinds. Managed cleanup `Failure`s and managed cleanup promise rejections do not replace that original rejection. Direct `throw`s inside `finally` are outside managed cleanup: they still escape unchanged, and they can replace an in-flight yielded `Failure` or main-path rejection.
- `run(...)` composes existing `Failable` results only. It does not capture thrown values or rejected promises into `Failure`.
- `or(...)` and `getOr(...)` are eager. The fallback expression runs before the method call.
- `orElse(...)` and `getOrElse(...)` are lazy. The callback runs only on failure.
- `match(onSuccess, onFailure)` is useful when both branches should converge to the same output type.
- `throwIfError(result)` throws `result.error` unchanged on failures and narrows the same hydrated result to `Success<T>` on return.
- `throwIfError(result)` is deliberately minimal. It does not normalize or map errors; if you want `Error` values, normalize earlier with `createFailable(..., NormalizedErrors)` or a custom `normalizeError`.
- `isFailable(...)`, `isSuccess(...)`, and `isFailure(...)` recognize only tagged hydrated instances, not public-shape lookalikes.
- `isFailableLike(...)` remains the validator for transport shapes, and `createFailable(failableLike)` is the supported rehydration path before calling instance methods.
- `createFailable(...)` remains the boundary tool for capture. Use `createFailable(() => ...)` for synchronous throw capture and `await createFailable(promise)` for async rejection capture.
- By default, `createFailable(...)` preserves raw thrown and rejected values. If something throws `'boom'`, `{ code: 'bad_request' }`, or `[error1, error2]`, that exact value becomes `.error`.
- `getOrThrow()` returns the success value and throws `result.error` unchanged on failures. Use `throwIfError(result)` when you want control-flow narrowing instead of a returned value.
- `createFailable(() => ...)` is for genuinely synchronous callbacks. TypeScript rejects obviously promise-returning callbacks, but JS callers and `any`/`unknown`-typed callbacks still rely on the runtime guard. If you already have a promise, pass it directly: `await createFailable(promise)`. That guard error stays actionable even when a custom `normalizeError` is present.

## Normalizing Errors

If you want `Error`-shaped failures, opt in explicitly with `NormalizedErrors`:

```ts
import { createFailable, NormalizedErrors } from '@pvorona/failable';

const result = createFailable(
  () => {
    throw { code: 'bad_request' };
  },
  NormalizedErrors
);

if (result.isError) {
  console.error(result.error.message);
  console.error(result.error.cause); // { code: 'bad_request' }
}
```

The same preset also normalizes existing `failure(...)` values and rehydrated `FailableLike`
failures, while still passing through existing `Error` instances unchanged.

Built-in normalization behaves like this:

- existing `Error` values pass through unchanged
- arrays become `AggregateError`
- other values become `Error`
- the original raw value is preserved in `error.cause`

Custom normalization is different: `normalizeError` runs for failure values, including
existing `Error` instances, so you can wrap or replace them. The one exception is the
internal sync-only callback misuse guard error from `createFailable(() => promise)`,
which is preserved as-is so the actionable message survives.

For custom normalization:

```ts
import { createFailable } from '@pvorona/failable';

const result = createFailable(doThing, {
  normalizeError(error) {
    return new Error('Operation failed', { cause: error });
  },
});
```

## Boundary Transport

Hydrated `Failable` values do not survive structured cloning because they carry methods and runtime details. If you need to cross a message boundary, convert to a plain shape first and rehydrate on the receiving side:

```ts
import { createFailable, toFailableLike } from '@pvorona/failable';

const wire = toFailableLike(result);
const hydrated = createFailable(wire);
```

`isFailableLike(...)` validates the strict wire shape `{ status, data }` or `{ status, error }`, and the inner `data` / `error` values must still be structured-cloneable.

## API At A Glance

- `type Failable<T, E>`: `Success<T> | Failure<E>`
- `type Success<T>`: success variant with `isSuccess`, `data`, `or(...)`, `orElse(...)`, `getOr(...)`, `getOrElse(...)`, `match(...)`, and `getOrThrow()`
- `type Failure<E>`: failure variant with `isError`, `error`, `or(...)`, `orElse(...)`, `getOr(...)`, `getOrElse(...)`, `match(...)`, and `getOrThrow()`
- `type FailableLike<T, E>`: strict structured-clone-friendly wire shape
- `const NormalizedErrors`: built-in token for `Error` normalization
- `success(data)` / `failure(error)`: explicit constructors
- `throwIfError(result)`: throw the stored failure unchanged and narrow the same result on success
- `run(...)`: compose sync or async `Failable` steps with short-circuiting
- `createFailable(...)`: wrap, preserve, rehydrate, or normalize results
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: runtime validators for tagged hydrated values
- `toFailableLike(...)`: convert a hydrated result into a plain transport shape
- `isFailableLike(...)`: validate the strict wire shape
- `const FailableStatus`: runtime `{ Success, Failure }` object for wire values
