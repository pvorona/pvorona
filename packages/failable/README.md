# @pvorona/failable

A typed result type for expected failures. `Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`, with ergonomic accessors and structured-clone support.

## Install

```bash
npm i @pvorona/failable
```

## Usage

```ts
import { createFailable } from '@pvorona/failable';

const result = createFailable(() => JSON.parse(text));

if (result.isSuccess) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Factories

```ts
import { failure, success } from '@pvorona/failable';

const ok = success(42);
const err = failure(new Error('boom'));
```

### Fallbacks

```ts
import { failure } from '@pvorona/failable';

const err = failure(new Error('boom'));

const value = err.getOr('default'); // 'default'
const recovered = err.or('fallback'); // Success<'fallback'>
```

### Wrapping async work

```ts
import { createFailable } from '@pvorona/failable';

const result = await createFailable(fetch('/api'));
```

### Structured-clone transport

`Failable` instances use Symbols and prototype methods that do not survive structured cloning (`postMessage`, `chrome.runtime.sendMessage`, etc.). Convert to a plain object first:

```ts
import { createFailable, toFailableLike } from '@pvorona/failable';

// sender
const wire = toFailableLike(result);
postMessage(wire);

// receiver
const hydrated = createFailable(wire);
```

## API

### `const enum FailableStatus`

The discriminant for `FailableLike` and `Failable` instances.

```ts
export const enum FailableStatus {
  Success = 'success',
  Failure = 'failure',
}
```

Example:

```ts
import { FailableStatus, type FailableLike } from '@pvorona/failable';

const ok: FailableLike<number, string> = {
  status: FailableStatus.Success,
  data: 1,
};
```

### `type Failable<T, E>`

Alias for `Success<T> | Failure<E>`.

Example:

```ts
import type { Failable } from '@pvorona/failable';
import { failure, success } from '@pvorona/failable';

export function parseIntSafe(input: string): Failable<number, Error> {
  const n = Number(input);
  if (!Number.isInteger(n)) return failure(new Error('Not an int'));

  return success(n);
}
```

### `type Success<T>`

The success variant.

Key fields/methods:

- `status: 'success'`, `isSuccess: true`, `isError: false`
- `data: T`, `error: null`
- `or(value)` returns itself
- `getOr(_)` returns `data`
- `getOrThrow()` returns `data`

Example:

```ts
import { success } from '@pvorona/failable';

const s = success(123);
s.getOr(0); // 123
s.or('x'); // Success<number>
```

### `type Failure<E>`

The failure variant.

Key fields/methods:

- `status: 'failure'`, `isSuccess: false`, `isError: true`
- `error: E`, `data: null`
- `or(value)` converts to `Success<typeof value>`
- `getOr(fallback)` returns `fallback`
- `getOrThrow()` throws `error`

Example:

```ts
import { failure } from '@pvorona/failable';

const f = failure(new Error('boom'));
f.getOr('default'); // 'default'
f.or(42).data; // 42
```

### `type FailableLike<T, E>`

Structured-clone-friendly representation of a result:

- `{ status: 'success', data }`
- `{ status: 'failure', error }`

Example:

```ts
import type { FailableLike } from '@pvorona/failable';

type Wire = FailableLike<{ id: string }, { code: string }>;
```

### `type FailableLikeSuccess<T>`

The success-shaped `FailableLike`.

Example:

```ts
import { FailableStatus, type FailableLikeSuccess } from '@pvorona/failable';

const wireOk: FailableLikeSuccess<number> = {
  status: FailableStatus.Success,
  data: 1,
};
```

### `type FailableLikeFailure<E>`

The failure-shaped `FailableLike`.

Example:

```ts
import { FailableStatus, type FailableLikeFailure } from '@pvorona/failable';

const wireErr: FailableLikeFailure<string> = {
  status: FailableStatus.Failure,
  error: 'bad_request',
};
```

### `FailableTag`, `SuccessTag`, `FailureTag` (Symbols)

Low-level Symbol tags used to mark hydrated `Failable` instances at runtime.

Most code should prefer `result.isSuccess` / `result.isError` or the guards `isSuccess(...)` / `isFailure(...)`.

Example (advanced):

```ts
import { FailableTag } from '@pvorona/failable';

export function isHydratedFailable(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as any)[FailableTag] === true
  );
}
```

### `success<T>(data: T): Success<T>`

Example:

```ts
import { success } from '@pvorona/failable';

const ok = success({ id: '1' });
```

### `failure<E>(error: E): Failure<E>`

Example:

```ts
import { failure } from '@pvorona/failable';

const err = failure({ code: 'bad_request' });
```

### `isFailable(value): value is Failable<unknown, unknown>`

Checks whether a value is a hydrated `Failable` instance (Symbol-tagged).

Example:

```ts
import { isFailable, success } from '@pvorona/failable';

const maybe: unknown = success(1);
if (isFailable(maybe)) {
  // narrowed
}
```

### `isSuccess(value): value is Success<unknown>`

Example:

```ts
import { isSuccess, success } from '@pvorona/failable';

const maybe: unknown = success(1);
if (isSuccess(maybe)) {
  maybe.data; // ok
}
```

### `isFailure(value): value is Failure<unknown>`

Example:

```ts
import { failure, isFailure } from '@pvorona/failable';

const maybe: unknown = failure('nope');
if (isFailure(maybe)) {
  console.log(maybe.error);
}
```

### `toFailableLike(result): FailableLike<...>`

Converts a hydrated `Failable` into a structured-clone-friendly representation.

Example:

```ts
import { success, toFailableLike } from '@pvorona/failable';

const res = success(1);
const wire = toFailableLike(res);
```

### `isFailableLike(value): value is FailableLike<unknown, unknown>`

Strictly checks for `{ status, data }` or `{ status, error }` with no extra enumerable keys.

Example:

```ts
import { isFailableLike } from '@pvorona/failable';

const wire: unknown = { status: 'success', data: 1 };
isFailableLike(wire); // true
```

### `createFailable(...)`

Overloads:

- `createFailable(failable)` → returns the same instance
- `createFailable(failableLike)` → rehydrates into a real `Success` / `Failure`
- `createFailable(() => value)` → captures throws into `Failure`
- `createFailable(promise)` → captures rejections into `Failure`

Examples:

```ts
import { createFailable, failure, toFailableLike } from '@pvorona/failable';

// function wrapper (captures throws)
const res1 = createFailable(() => JSON.parse('{'));

// promise wrapper (captures rejections)
const res2 = await createFailable(fetch('https://example.com'));

// rehydrate from structured clone
const wire = toFailableLike(failure('bad'));
const hydrated = createFailable(wire);
```
