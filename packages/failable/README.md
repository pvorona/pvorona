# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

`Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`. In normal application code, return `success(...)` / `failure(...)`, then branch with `result.isSuccess` / `result.isError`. Keep `isSuccess(...)` / `isFailure(...)` for validating `unknown` values or external inputs.

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
- `result.getOr(fallback)`: get the success value or a fallback
- `result.or(fallback)`: always end up with `Success<T>`
- `result.getOrThrow()`: unwrap success or throw the failure value

### `createFailable(...)` for throwy or rejecting code

`createFailable(...)` is the convenience entrypoint when you want to capture sync throws, promise rejections, or reuse an existing result shape:

- `createFailable(failable)` returns the same instance
- `createFailable(failableLike)` rehydrates into a real `Success` / `Failure`
- `createFailable(() => value)` captures sync throws into `Failure`
- `createFailable(promise)` captures promise rejections into `Failure`
- If a callback returns, or a promise resolves to, a `Failable` or `FailableLike`, `createFailable(...)` preserves that result instead of nesting it inside `Success`

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

### Use guards for `unknown` values

Use `isFailable(...)`, `isSuccess(...)`, and `isFailure(...)` when you are validating something that might already be a hydrated `Failable`:

```ts
import { isFailable } from '@pvorona/failable';

const candidate: unknown = maybeFromAnotherModule();

if (isFailable(candidate) && candidate.isError) {
  console.error(candidate.error);
}
```

Use `isSuccess(...)` / `isFailure(...)` when you only care about one branch. If you are validating plain wire data, use `isFailableLike(...)` and then rehydrate with `createFailable(...)`.

## Important Semantics

- Hydrated `Failable` values are frozen plain objects with methods. Prefer `result.isSuccess` / `result.isError`, and do not use `instanceof`.
- `or(...)` and `getOr(...)` are eager. The fallback expression runs before the method call.
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
- `type Success<T>`: success variant with `isSuccess`, `data`, `or(...)`, `getOr(...)`, and `getOrThrow()`
- `type Failure<E>`: failure variant with `isError`, `error`, `or(...)`, `getOr(...)`, and `getOrThrow()`
- `type FailableLike<T, E>`: strict structured-clone-friendly wire shape
- `const NormalizedErrors`: built-in token for `Error` normalization
- `success(data)` / `failure(error)`: explicit constructors
- `createFailable(...)`: wrap, preserve, rehydrate, or normalize results
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: runtime validators for hydrated values
- `toFailableLike(...)`: convert a hydrated result into a plain transport shape
- `isFailableLike(...)`: validate the strict wire shape
- `const FailableStatus`: runtime `{ Success, Failure }` object for wire values
