# @pvorona/failable

A typed result type for expected failures. `Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`, with ergonomic accessors and structured-clone support.

## Install

```bash
npm i @pvorona/failable
```

## Usage

```ts
import { Failable } from '@pvorona/failable';

const result = Failable.from(() => JSON.parse(text));

if (result.isSuccess) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Factories

```ts
import { Failable } from '@pvorona/failable';

const success = Failable.ofSuccess(42);
const failure = Failable.ofError(new Error('boom'));
```

### Fallbacks

```ts
import { Failable } from '@pvorona/failable';

const failure = Failable.ofError(new Error('boom'));

const value = failure.getOr('default'); // 'default'
const recovered = failure.or('fallback'); // Success<'fallback'>
```

### Wrapping async work

```ts
import { Failable } from '@pvorona/failable';

const result = await Failable.from(fetch('/api'));
```

### Structured-clone transport

`Failable` instances use Symbols and prototype methods that do not survive structured cloning (`postMessage`, `chrome.runtime.sendMessage`, etc.). Convert to a plain object first:

```ts
import { Failable } from '@pvorona/failable';

// sender
const wire = Failable.toFailableLike(result);
postMessage(wire);

// receiver
const hydrated = Failable.from(wire);
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
import { Failable as FailableNS } from '@pvorona/failable';

export function parseIntSafe(input: string): Failable<number, Error> {
  const n = Number(input);
  if (!Number.isInteger(n)) return FailableNS.ofError(new Error('Not an int'));

  return FailableNS.ofSuccess(n);
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
import { Failable } from '@pvorona/failable';

const s = Failable.ofSuccess(123);
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
import { Failable } from '@pvorona/failable';

const f = Failable.ofError(new Error('boom'));
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

Most code should prefer `result.isSuccess` / `result.isError` or the guards `Failable.isSuccess(...)` / `Failable.isFailure(...)`.

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

### `const Failable`

Namespace-style factory + utilities for producing and working with `Failable<T, E>`.

#### `Failable.ofSuccess<T>(data: T): Success<T>`

Example:

```ts
import { Failable } from '@pvorona/failable';

const ok = Failable.ofSuccess({ id: '1' });
```

#### `Failable.ofError<E>(error: E): Failure<E>`

Example:

```ts
import { Failable } from '@pvorona/failable';

const err = Failable.ofError({ code: 'bad_request' });
```

#### `Failable.isFailable(value): value is Failable<unknown, unknown>`

Checks whether a value is a hydrated `Failable` instance (Symbol-tagged).

Example:

```ts
import { Failable } from '@pvorona/failable';

const maybe: unknown = Failable.ofSuccess(1);
if (Failable.isFailable(maybe)) {
  // narrowed
}
```

#### `Failable.isSuccess(value): value is Success<unknown>`

Example:

```ts
import { Failable } from '@pvorona/failable';

const maybe: unknown = Failable.ofSuccess(1);
if (Failable.isSuccess(maybe)) {
  maybe.data; // ok
}
```

#### `Failable.isFailure(value): value is Failure<unknown>`

Example:

```ts
import { Failable } from '@pvorona/failable';

const maybe: unknown = Failable.ofError('nope');
if (Failable.isFailure(maybe)) {
  console.log(maybe.error);
}
```

#### `Failable.toFailableLike(result): FailableLike<...>`

Converts a hydrated `Failable` into a structured-clone-friendly representation.

Example:

```ts
import { Failable } from '@pvorona/failable';

const res = Failable.ofSuccess(1);
const wire = Failable.toFailableLike(res);
```

#### `Failable.isFailableLike(value): value is FailableLike<unknown, unknown>`

Strictly checks for `{ status, data }` or `{ status, error }` with no extra enumerable keys.

Example:

```ts
import { Failable } from '@pvorona/failable';

const wire: unknown = { status: 'success', data: 1 };
Failable.isFailableLike(wire); // true
```

#### `Failable.from(...)`

Overloads:

- `from(failable)` → returns the same instance
- `from(failableLike)` → rehydrates into a real `Success` / `Failure`
- `from(() => value)` → captures throws into `Failure`
- `from(promise)` → captures rejections into `Failure`

Examples:

```ts
import { Failable } from '@pvorona/failable';

// function wrapper (captures throws)
const res1 = Failable.from(() => JSON.parse('{'));

// promise wrapper (captures rejections)
const res2 = await Failable.from(fetch('https://example.com'));

// rehydrate from structured clone
const wire = Failable.toFailableLike(Failable.ofError('bad'));
const hydrated = Failable.from(wire);
```
