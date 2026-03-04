# @pvorona/noop

A tiny no-op function.

## Install

```bash
npm i @pvorona/noop
```

## Usage

```ts
import { noop } from '@pvorona/noop';

element.addEventListener('scroll', handler ?? noop);
```

Another common use: default optional callbacks.

```ts
import { noop } from '@pvorona/noop';

export function withFinally(run: () => void, onFinally: () => void = noop) {
  try {
    run();
  } finally {
    onFinally();
  }
}
```

## API

### `noop(): void`

Does nothing and returns `void`.

Notes:

- You can pass `noop` where a callback is required but you have nothing to do.
- In JavaScript, extra arguments are ignored, so `noop` is also safe as a fallback for many event handler types.

Example:

```ts
import { noop } from '@pvorona/noop';

const onError: (e: unknown) => void = noop;
```
