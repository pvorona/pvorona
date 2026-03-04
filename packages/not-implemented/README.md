# @pvorona/not-implemented

A typed `TODO` for code paths that haven't been implemented yet.

## Install

```bash
npm i @pvorona/not-implemented
```

## Usage

```ts
import { notImplemented, NotImplementedError } from '@pvorona/not-implemented';

type Shape = 'circle' | 'square' | 'triangle';

function area(shape: Shape): number {
  switch (shape) {
    case 'circle':
      return Math.PI * r * r;
    case 'square':
      return side * side;
    case 'triangle':
      notImplemented('Triangle area');
  }
}

// Custom error handling
try {
  notImplemented();
} catch (e) {
  console.log(e instanceof NotImplementedError); // true
  console.log(e.message); // 'Not implemented'
}
```

## API

### `class NotImplementedError extends Error`

An `Error` subclass thrown by `notImplemented()`.

Example:

```ts
import { NotImplementedError } from '@pvorona/not-implemented';

const err = new NotImplementedError('Feature X');
err.name; // "NotImplementedError"
```

### `notImplemented(message?: string): never`

Throws a `NotImplementedError` with a clean stack trace.

- **`message`**: optional message (defaults to `"Not implemented"`)
- **returns**: `never` (it always throws)

Example:

```ts
import { notImplemented } from '@pvorona/not-implemented';

export function decodeBase32(_input: string): Uint8Array {
  notImplemented('decodeBase32');
}
```
