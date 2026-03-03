# @pvorona/disposable

Centralize teardown/cleanup for a unit of work. Register many cleanup callbacks, then run them all exactly once via `dispose()`.

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
  if (result.ok) {
    console.log('all listeners completed successfully');
  } else {
    console.error('disposal had errors:', result.error);
  }
});
```

### AbortController / cancellation

```ts
const disposable = createDisposable();
const abortController = new AbortController();
disposable.onDisposed(() => abortController.abort());
```
