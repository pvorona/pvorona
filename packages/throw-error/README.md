# @pvorona/throw-error

Throw errors with clean stack traces pointing at the caller, not the internals.

## Install

```bash
npm i @pvorona/throw-error
```

## Usage

```ts
import { throwError } from '@pvorona/throw-error';

function parsePort(input: string): number {
  const port = Number(input);

  if (!Number.isInteger(port) || port <= 0 || port >= 65536) {
    throwError(new RangeError(`Invalid port: ${input}`));
    // Stack trace points here ^, not inside throwError
  }

  return port;
}
```

### Skipping extra stack frames

```ts
function validateEmail(input: string): string {
  if (!input.includes('@')) {
    // Stack trace will skip validateEmail and point at its caller
    throwError(new Error('Invalid email'), validateEmail);
  }

  return input;
}
```

## API

### `throwError(error: Error, functionToSkipStackFrames?: Function): never`

Throws `error`, attempting to make its stack trace point at the caller (instead of the `throwError` internals).

- **`error`**: the error to throw
- **`functionToSkipStackFrames`**: a function to pass as the “stack start” (defaults to `throwError`)
  - Use this when you have a helper wrapper and want to hide that wrapper from the stack trace.

Notes:

- Uses `Error.captureStackTrace` when available (Node/V8). In other runtimes, it simply throws.
- The return type is `never`, so it plays nicely with guard-clause control flow.

Example (wrapping):

```ts
import { throwError } from '@pvorona/throw-error';

export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (condition) return;
  throwError(new Error(message), invariant);
}
```
