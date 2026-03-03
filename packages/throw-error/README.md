# @pvorona/throw-error

Throw errors with clean stack traces pointing at the caller, not the internals.

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
