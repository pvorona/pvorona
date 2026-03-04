# @pvorona/disposable

Centralize teardown/cleanup for a unit of work. Register many cleanup callbacks, then run them all exactly once via `dispose()`.

## Install

```bash
npm i @pvorona/disposable
```

## Usage

```ts
import { createDisposable } from '@pvorona/disposable';

const disposable = createDisposable();

disposable.onDisposed(() => window.removeEventListener('resize', onResize));
disposable.onDisposed(() => clearInterval(intervalId));
disposable.onDisposed(() => observer.disconnect());

// Later — runs all registered listeners exactly once:
disposable.dispose();
```

### Inline teardown registration

```ts
const disposable = createDisposable();

disposable.onDisposed(addEventListeners(el, { click: onClick }));
disposable.onDisposed(autorun(effect)); // mobx autorun returns a disposer

return () => disposable.dispose();
```

### Completion callback

```ts
disposable.dispose((result) => {
  if (result.isSuccess) return;
  console.error('disposal had errors:', result.error);
});
```

### AbortController / cancellation

```ts
const disposable = createDisposable();
const abortController = new AbortController();
disposable.onDisposed(() => abortController.abort());
```

## API

### `type OnDisposedListener`

A disposal callback. You can register either:

- `() => void` (sync)
- `() => PromiseLike<unknown>` (async-ish)

Notes:

- `dispose()` **invokes** listeners and does not `await` them.
- If you need a completion result that accounts for promise rejections, use `dispose(onCompleted)`.

Example:

```ts
import type { OnDisposedListener } from '@pvorona/disposable';

const listener: OnDisposedListener = () => {
  // cleanup
};
```

### `type OnCompletedListener`

Called when disposal “completes”, with a `Failable<null, Error>` result.

- success/failure is represented via `result.isSuccess` / `result.isError`
- sync exceptions thrown by listeners are captured
- promise rejections from async listeners are captured (when you use `dispose(onCompleted)`)

Example:

```ts
import type { OnCompletedListener } from '@pvorona/disposable';

const onCompleted: OnCompletedListener = (result) => {
  if (result.isSuccess) return;
  console.error('dispose failed:', result.error);
};
```

### `type Disposable`

The disposable interface.

```ts
export type Disposable = {
  readonly isDisposed: boolean;
  readonly isDisposing: boolean;
  readonly dispose: (onCompleted?: OnCompletedListener) => boolean;
  readonly onDisposed: (listener: OnDisposedListener) => () => void;
};
```

Example (unsubscribe from a listener):

```ts
import { createDisposable } from '@pvorona/disposable';

const d = createDisposable();
const unsubscribe = d.onDisposed(() => console.log('cleanup'));

unsubscribe(); // removes that listener
d.dispose(); // nothing logs
```

### `createDisposable(): Disposable`

Creates a new disposable.

Key semantics:

- `dispose()` is **idempotent**:
  - returns `true` on the first call (it started disposing)
  - returns `false` if already disposing/disposed
- `onDisposed(listener)` returns an unsubscribe function
  - If already disposed, it invokes `listener` immediately and returns a no-op unsubscribe.

Example (idempotency):

```ts
import { createDisposable } from '@pvorona/disposable';

const d = createDisposable();
console.log(d.dispose()); // true
console.log(d.dispose()); // false
```
