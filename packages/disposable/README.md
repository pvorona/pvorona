# @pvorona/disposable

Centralize teardown for a unit of work and observe when disposal has fully settled.

## Install

```bash
npm i @pvorona/disposable
```

## Quick Start

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();

disposable.onDispose(() => window.removeEventListener('resize', onResize));
disposable.onDispose(() => clearInterval(intervalId));
disposable.onDispose(() => observer.disconnect());

disposable.onDisposed((result) => {
  if (result.isError) {
    console.error('cleanup failed:', result.error.errors);
  }
});

disposable.dispose();
```

## Important Semantics

- `dispose()` is synchronous and idempotent. It returns `true` only on the call that starts disposal.
- `onDispose(...)` callbacks run during disposal, before `isDisposed` flips to `true`.
- `onDisposed(...)` callbacks receive the final `DisposeResult`. They run in the same `dispose()` call when cleanup is fully synchronous, and they wait for tracked promises only when one or more `onDispose(...)` callbacks return a promise.
- Duplicate `onDispose(...)` listener functions registered before disposal are de-duped.
- Late `onDispose(...)` registration after disposal invokes immediately and returns a no-op unsubscribe. Late `onDisposed(...)` registration after completion replays the cached result immediately.
- Listener order is insertion order. If an `onDispose(...)` listener registers another `onDispose(...)` listener during disposal, the new listener is drained later in the same disposal pass.

## Compatibility

- This package is ESM-only. It does not publish a CommonJS `require` condition.
- The published package declares `Node >=18` and emits modern ESM (`type: module`, package `exports`, `Promise.allSettled`, ES2022 target).

## Usage

### Sync cleanup only

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();

const unsubscribe = disposable.onDispose(() => {
  console.log('closing resources');
});

unsubscribe(); // remove that cleanup if plans change

disposable.dispose();
```

### Async cleanup with `onDisposed(...)`

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();

disposable.onDispose(async () => {
  await database.close();
});

disposable.onDisposed((result) => {
  if (result.isSuccess) return;

  console.error('disposal failed:', result.error.errors);
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
- `() => PromiseLike<unknown>` for async cleanup that should delay `onDisposed(...)`

### `DisposeError`

Stable failure shape emitted when one or more cleanup callbacks throw or reject.

```ts
type DisposeError = {
  readonly errors: readonly [unknown, ...unknown[]];
};
```

### `DisposeResult`

Final completion result delivered to `onDisposed(...)`.

```ts
type DisposeResult = Failable<null, DisposeError>;
```

### `OnDisposedListener`

Completion observer called after all async cleanup settles.

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

Creates a new `Disposable` that coordinates cleanup registration and final completion observation.
