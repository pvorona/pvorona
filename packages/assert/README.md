# @pvorona/assert

Use `@pvorona/assert` for runtime assertions, nullish narrowing, object and property checks, and a few small array and number helpers in TypeScript code.

## Install and import

```bash
npm i @pvorona/assert
```

- Import runtime helpers with standard ESM syntax, for example `import { assert } from '@pvorona/assert'`
- Import public types with `import type`, for example `import type { ReadonlyNonEmptyArray } from '@pvorona/assert'`
- The published package is ESM-only
- The published package requires Node `>=20`
- This repo currently verifies the package with TypeScript `5.9+`

## When this package fits

- Use it to throw on impossible states with `assert(...)` or `ensure*` helpers.
- Use it to narrow existing unions such as `string | number`, `T | undefined`, or `T | null | undefined`.
- Use it when you want small reusable checks like `hasOwnPropertyValue(...)`, `isPromiseLike(...)`, or `isNonEmptyArray(...)`.

These helpers are mainly for narrowing values that already include the member you want to keep. They are not meant to act like loose `unknown -> whatever` casts.

`defined` means `not undefined`. It does not mean `not nullish`, so use `ensureNotNull(...)` or `ensureNotNullOrUndefined(...)` when those match the actual input shape better.

## Quick start

### Throw on impossible state with `assert(...)`

`assert(...)` takes a boolean condition. If the condition is `false`, it throws `AssertionError`.

The message can be a string or a lazy getter.

```ts
import { assert } from '@pvorona/assert';

export function parsePort(input: string): number {
  const port = Number(input);

  assert(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid port');

  return port;
}
```

### Remove `null` and `undefined`

```ts
import { ensureNotNullOrUndefined } from '@pvorona/assert';

const envPort: null | string | undefined = process.env['PORT'];
const port = ensureNotNullOrUndefined(envPort);
// port: string
```

Use `ensureDefined(...)` for `T | undefined` and `ensureNotNull(...)` for `T | null`.

### Check an object property on `unknown`

```ts
import { hasOwnPropertyValue } from '@pvorona/assert';

const result: unknown = { status: 'success', value: 42 };

if (hasOwnPropertyValue(result, 'status', 'success')) {
  console.log(result['status']);
}
```

### Narrow an existing union

```ts
import { isString } from '@pvorona/assert';

function format(value: string | number): string {
  if (!isString(value)) return String(value);

  return value.toUpperCase();
}
```

This is the intended style of use:

- Good fit: `isString(value)` when `value` is `string | number`
- Not a good fit: treating `isString(...)` like a loose parser for arbitrary `unknown`

## Stable public surface

- Runtime helpers: `assert`, `AssertionError`, the root `is*` and `ensure*` helpers, `isPromiseLike`, `hasOwnKey`, and `hasOwnPropertyValue`
- Public types: `NonEmptyArray` and `ReadonlyNonEmptyArray`

## Migration notes

The root package no longer re-exports some advanced helpers from older internal surfaces.

- `resolveValueOrGetter` moved to a private workspace package and is no longer part of the published API
- `Mutable` moved to a private workspace package and is no longer part of the published API
- External consumers should define local equivalents if they still need either helper
- Removed root exports include internal-looking helpers such as `Override`, `InferErrorMessage`, `NotOnly*`, `Includes*`, `AtLeastOneValid`, and `InferArrayType`
- `NonEmptyArray` and `ReadonlyNonEmptyArray` remain public
- There is no replacement public subpath for the removed advanced types; if you still need them, define local equivalents in your own codebase
