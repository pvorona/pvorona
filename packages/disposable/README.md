# @pvorona/disposable

Use `@pvorona/disposable` when one unit of work owns several resources and you
want one place to register their cleanup. `dispose()` starts teardown
synchronously, and `onDisposed(...)` lets you react once every tracked async
cleanup has settled.

## Install

```bash
npm i @pvorona/disposable
```

This package is ESM-only and targets `Node >=18`.

## Lifecycle

- Register cleanup with `onDispose(...)`. Each listener may do synchronous work
  or return a promise.
- Call `dispose()` to start teardown. It returns `true` only for the call that
  started disposal, so repeated calls are safe.
- While `onDispose(...)` listeners are running, `isDisposing` is `true` and
  `isDisposed` stays `false`.
- `onDisposed(...)` receives the final `DisposeResult`. If cleanup is fully
  synchronous, it fires before `dispose()` returns. If any listener returns a
  promise, it waits for those promises to settle.

## Quick Start

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();
const released: string[] = [];

disposable.onDispose(() => {
  released.push('file handle');
});

disposable.onDispose(async () => {
  await Promise.resolve();
  released.push('metrics flush');
});

disposable.onDisposed((result) => {
  if (result.isError) {
    console.error('cleanup failed:', result.error.errors);
    return;
  }

  console.log('cleanup finished:', released);
});

disposable.dispose();
```

## Failure handling

- Cleanup is best-effort. If one `onDispose(...)` listener throws, the remaining
  still-registered listeners still run.
- `dispose()` does not throw when cleanup listeners throw or reject. Its
  boolean return only tells you whether this call started disposal.
- `onDisposed(...)` receives the aggregated `DisposeResult`.
- On failure, `DisposeError.errors` contains a non-empty `readonly` tuple of
  raw thrown or rejected `unknown` values. They are not guaranteed to be
  `Error` objects.

## Usage

### Remove a cleanup before disposal

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();

const unsubscribe = disposable.onDispose(() => {
  console.log('closing resource');
});

unsubscribe();

disposable.dispose();
```

### Wait for async cleanup to finish

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();
let flushed = false;

disposable.onDispose(async () => {
  await Promise.resolve();
  flushed = true;
});

disposable.onDisposed((result) => {
  if (result.isError) {
    console.error('disposal failed:', result.error.errors);
    return;
  }

  console.log('flushed:', flushed);
});

disposable.dispose();
```

### `AbortController` cleanup

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();
const abortController = new AbortController();

disposable.onDispose(() => {
  abortController.abort();
});

fetch(url, { signal: abortController.signal });

disposable.dispose();
```

## API

### `OnDisposeListener`

Cleanup callback registered with `onDispose(...)`.

- `() => void` for synchronous cleanup
- `() => PromiseLike<unknown>` for async cleanup that should delay
  `onDisposed(...)`

### `DisposeError`

Stable failure shape emitted when one or more cleanup callbacks throw or reject.

```ts
type DisposeError = {
  readonly errors: readonly [unknown, ...unknown[]];
};
```

### `DisposeResult`

Final completion result delivered to `onDisposed(...)`.

If you do not already use `Failable`, read `Failable<null, DisposeError>` as:
success means cleanup finished, and error means cleanup finished with one or
more failures.

```ts
type DisposeResult = Failable<null, DisposeError>;
```

### `OnDisposedListener`

Completion observer called with the final `DisposeResult`.

```ts
type OnDisposedListener = (result: DisposeResult) => void;
```

### `Disposable`

```ts
type Disposable = {
  readonly isDisposed: boolean;
  readonly isDisposing: boolean;
  readonly dispose: () => boolean;
  readonly onDispose: (listener: OnDisposeListener) => () => void;
  readonly onDisposed: (listener: OnDisposedListener) => () => void;
};
```

### `createDisposable()`

Creates a new `Disposable` that coordinates cleanup registration and completion
observation.
