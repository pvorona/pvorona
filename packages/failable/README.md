# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

`Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`. In normal application code, return `success(...)` / `failure(...)`, then branch with `result.isSuccess` / `result.isError`. Keep `isSuccess(...)` / `isFailure(...)` for validating hydrated unknown values, and use `isFailableLike(...)` for plain transport shapes.

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

### Return `success(...)` and `failure(...)`

Use the explicit constructors when your function already knows which branch it should return:

```ts
import { failure, success } from '@pvorona/failable';

const ok = success({ id: '1' });
const err = failure({ code: 'bad_request' });
```

### Branch and unwrap with instance methods

Hydrated `Failable` values carry booleans and convenience methods, so everyday code can stay local and direct:

```ts
import { failure, success } from '@pvorona/failable';

const portResult = Math.random() > 0.5
  ? success(3000)
  : failure('Missing port');

if (portResult.isError) {
  console.error(portResult.error);
} else {
  const requiredPort = portResult.getOrThrow();
  console.log(requiredPort);
}

const port = portResult.getOr(3000);
const ensuredPort = portResult.or(3000);
console.log(port, ensuredPort.data);
```

- `result.isSuccess` / `result.isError`: branch on a hydrated result
- `result.getOr(fallback)`: eagerly get the success value or a fallback
- `result.getOrElse(() => fallback)`: lazily compute a fallback value only on failure
- `result.or(fallback)`: eagerly end up with `Success<T>`
- `result.orElse(() => fallback)`: lazily recover to `Success<T>` only on failure
- `result.match(onSuccess, onFailure)`: map both branches to one output type
- `result.getOrThrow()`: unwrap success or throw the failure value

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

`createFailable(...)` is the convenience entrypoint when you want to capture sync throws, promise rejections, or reuse an existing result shape. Unlike `run(...)`, it is for exception/rejection boundaries rather than `Failable`-to-`Failable` composition:

- `createFailable(failable)` returns the same tagged hydrated instance
- `createFailable(failableLike)` rehydrates a strict wire shape into a real `Success` / `Failure`
- `createFailable(() => value)` captures sync throws into `Failure`
- `createFailable(promise)` captures promise rejections into `Failure`
- If a callback returns, or a promise resolves to, a `Failable` or `FailableLike`, `createFailable(...)` preserves that result instead of nesting it inside `Success`

Plain lookalike objects are not treated as hydrated `Failable` instances. If you have plain `{ status, data }` or `{ status, error }` transport data, validate it with `isFailableLike(...)` or pass it to `createFailable(...)` to rehydrate before calling instance methods.

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
  const portResult = createFailable(() => readPort(configResult.data.port));

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

### `run(function* ({ get }) { ... })` for sync composition

Use `run(...)` when you want to compose existing synchronous `Failable` results without nested `if` blocks. Inside the generator, use `yield* get(result)` to unwrap a success value. If any yielded result is a `Failure`, `run(...)` returns that same `Failure` instance after any `finally` cleanup runs and skips the remaining happy-path steps.

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

Important `run(...)` rules:

- Use `run(...)` for `Failable`-to-`Failable` composition. Use `createFailable(...)` when you need to capture sync throws, promise rejections, or rehydrate a `FailableLike`.
- It is sync-only. If you need promise rejection capture, keep using `await createFailable(promise)`.
- Use `yield* get(failable)` inside the callback. Other interaction with `get` internals is unsupported and not part of the API contract.
- `get` exists only inside the generator callback; it is not a public export.
- Return `success(...)`, `failure(...)`, or another `Failable`. An empty generator or bare `return` becomes `Success<void>`, but raw return values are rejected.
- Throwing inside the generator is not converted into `Failure`; foreign exceptions are rethrown unchanged.

### Use guards for `unknown` values

Use `isFailable(...)`, `isSuccess(...)`, and `isFailure(...)` when you are validating something that might already be a hydrated `Failable` instance:

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
- `run(...)` is sync-only in v1. Use `yield* get(failable)` inside the callback and return a `Failable`, or finish without returning a value to get `Success<void>`.
- `run(...)` short-circuits on the first yielded failure, preserves that original `Failure` instance unchanged, and still runs `finally` cleanup before returning.
- `or(...)` and `getOr(...)` are eager. The fallback expression runs before the method call.
- `orElse(...)` and `getOrElse(...)` are lazy. The callback runs only on failure.
- `match(onSuccess, onFailure)` is useful when both branches should converge to the same output type.
- `isFailable(...)`, `isSuccess(...)`, and `isFailure(...)` recognize only tagged hydrated instances, not public-shape lookalikes.
- `isFailableLike(...)` remains the validator for transport shapes, and `createFailable(failableLike)` is the supported rehydration path before calling instance methods.
- By default, `createFailable(...)` preserves raw thrown and rejected values. If something throws `'boom'`, `{ code: 'bad_request' }`, or `[error1, error2]`, that exact value becomes `.error`.
- `getOrThrow()` throws `result.error` unchanged on failures. If you want `Error` values, opt into normalization.
- `createFailable(async () => value)` is a footgun. The async function itself is treated as a sync return value, so the result is `Success<Promise<T>>`. If you want rejection capture, pass the promise directly: `await createFailable(somePromise)`.

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

The same option also normalizes existing `failure(...)` values and rehydrated `FailableLike` failures.

Built-in normalization behaves like this:

- existing `Error` values pass through unchanged
- arrays become `AggregateError`
- other values become `Error`
- the original raw value is preserved in `error.cause`

For custom normalization:

```ts
import { createFailable } from '@pvorona/failable';

const result = createFailable(doThing, {
  normalizeError(error) {
    return error instanceof Error
      ? error
      : new Error('Operation failed', { cause: error });
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
- `run(function* ({ get }) { ... })`: compose sync `Failable` steps with short-circuiting
- `createFailable(...)`: wrap, preserve, rehydrate, or normalize results
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: runtime validators for tagged hydrated values
- `toFailableLike(...)`: convert a hydrated result into a plain transport shape
- `isFailableLike(...)`: validate the strict wire shape
- `const FailableStatus`: runtime `{ Success, Failure }` object for wire values
