# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

`Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`. In the common case, you model the return type explicitly, construct with `success(...)` / `failure(...)`, and branch with `isSuccess(...)` / `isFailure(...)` or the `isSuccess` / `isError` flags.

## Install

```bash
npm i @pvorona/failable
```

## Quick start

```ts
import type { Failable } from '@pvorona/failable';
import { failure, isFailure, success } from '@pvorona/failable';

function divide(a: number, b: number): Failable<number, string> {
  if (b === 0) return failure('Cannot divide by zero');

  return success(a / b);
}

const result = divide(10, 2);

if (isFailure(result)) {
  console.error(result.error);
} else {
  console.log(result.data);
}
```

## Core API

### `type Failable<T, E>`

Alias for `Success<T> | Failure<E>`.

### `success(data)` and `failure(error)`

Use these when you already know whether you are returning success or failure:

```ts
import { failure, success } from '@pvorona/failable';

const ok = success({ id: '1' });
const err = failure({ code: 'bad_request' });
```

### `isSuccess(...)` and `isFailure(...)`

Use the guards or the instance booleans (`result.isSuccess` / `result.isError`) to branch:

```ts
import { failure, isSuccess, success } from '@pvorona/failable';

const result = Math.random() > 0.5 ? success(123) : failure('boom');

if (isSuccess(result)) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### `createFailable(...)`

`createFailable(...)` is a convenience wrapper when you want to capture thrown or rejected values:

- `createFailable(failable)` returns the same instance
- `createFailable(failableLike)` rehydrates into a real `Success` / `Failure`
- `createFailable(() => value)` captures sync throws into `Failure`
- `createFailable(promise)` captures promise rejections into `Failure`

Example:

```ts
import { createFailable, isFailure } from '@pvorona/failable';

const responseResult = await createFailable(fetch('https://example.com/items'));

if (isFailure(responseResult)) {
  console.error('Network failure:', responseResult.error);
} else if (!responseResult.data.ok) {
  console.error(`Unexpected status: ${responseResult.data.status}`);
} else {
  const text = await responseResult.data.text();
  const parseResult = createFailable(() => JSON.parse(text));

  if (isFailure(parseResult)) {
    console.error('Invalid JSON:', parseResult.error);
  } else {
    console.log(parseResult.data);
  }
}
```

## Important semantics

- `createFailable(async () => value)` is a footgun. The async function itself is treated as a sync return value, so the result is `Success<Promise<T>>`. If you want rejection capture, pass the promise directly: `await createFailable(somePromise)`.
- `or(...)` and `getOr(...)` are eager. The fallback expression runs before the method call.
- `isFailableLike(...)` is intentionally strict. It only accepts exactly `{ status, data }` or `{ status, error }` with no extra enumerable keys.
- By default, `createFailable(...)` preserves raw thrown and rejected values. If something throws `'boom'`, `{ code: 'bad_request' }`, or `[error1, error2]`, that exact value becomes `.error`.
- `createFailable(input, NormalizedErrors)` converts non-`Error` failures into `Error` values:
  - existing `Error` values pass through unchanged
  - arrays become `AggregateError`
  - other values become `Error`
  - the original raw value is preserved in `error.cause`
- `createFailable(input, { normalizeError })` lets you supply your own normalization strategy.
- The library still uses private runtime tags internally for hydrated instances, but those details are not part of the public API.
- This package is ESM-only. Use `import` syntax; there is no `require` export condition.

## Normalizing errors

If you want `Error`-shaped handling at the boundary, opt in explicitly:

```ts
import {
  createFailable,
  isFailure,
  NormalizedErrors,
} from '@pvorona/failable';

const result = createFailable(
  () => {
    throw { code: 'bad_request' };
  },
  NormalizedErrors
);

if (isFailure(result)) {
  console.error(result.error.message);
  console.error(result.error.cause); // { code: 'bad_request' }
}
```

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

## Structured-clone transport

Hydrated `Failable` instances have methods and private runtime details that do not survive structured cloning (`postMessage`, `MessagePort`, extension messaging, etc.). Convert them to plain objects first:

```ts
import { createFailable, toFailableLike } from '@pvorona/failable';

const result = createFailable(() => JSON.parse('{"ok":true}'));

// sender
const wire = toFailableLike(result);
postMessage(wire);

// receiver
const hydrated = createFailable(wire);
```

The transport shape is:

- `FailableLikeSuccess<T>`: `{ status: FailableStatus.Success, data: T }`
- `FailableLikeFailure<E>`: `{ status: FailableStatus.Failure, error: E }`

`FailableStatus` is a runtime object:

```ts
import { FailableStatus, type FailableLike } from '@pvorona/failable';

const wire: FailableLike<number, string> = {
  status: FailableStatus.Success,
  data: 1,
};
```

## API at a glance

- `type Failable<T, E>`: `Success<T> | Failure<E>`
- `type Success<T>`: success variant with `data`, `or(...)`, `getOr(...)`, and `getOrThrow()`
- `type Failure<E>`: failure variant with `error`, `or(...)`, `getOr(...)`, and `getOrThrow()`
- `const FailableStatus`: runtime `{ Success, Failure }` object
- `const NormalizedErrors`: built-in token for `Error` normalization
- `success(data)` / `failure(error)`: explicit constructors
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: runtime guards for hydrated values
- `toFailableLike(...)`: convert a hydrated result into a structured-clone-friendly value
- `isFailableLike(...)`: validate the strict structured-clone shape
- `createFailable(...)`: wrap, rehydrate, or normalize results
