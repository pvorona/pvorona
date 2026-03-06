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

### `assert(...)`

```ts
import { assert } from '@pvorona/assert';

export function parsePort(input: string): number {
  const port = Number(input);

  assert(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid port');

  return port;
}
```

### Null-safe DOM lookup

```ts
import { ensureNotNull } from '@pvorona/assert';

const root = ensureNotNull(document.getElementById('root'));
// root: HTMLElement
```

Use `ensureDefined(...)` only when the missing case is actually `undefined`.

### Restrictive guard example

```ts
import { isString } from '@pvorona/assert';

function format(value: string | number): string {
  if (!isString(value)) return String(value);

  return value.toUpperCase();
}
```

### `isPromiseLike(...)`

```ts
import { isPromiseLike } from '@pvorona/assert';

async function awaitIfNeeded(value: unknown): Promise<unknown> {
  if (!isPromiseLike(value)) return value;

  return await value;
}
```

### `hasOwnKey(...)`

```ts
import { hasOwnKey } from '@pvorona/assert';

const durationBrand = Symbol('duration');
const value: unknown = { [durationBrand]: true, milliseconds: 250 };

if (hasOwnKey(value, durationBrand) && hasOwnKey(value, 'milliseconds')) {
  console.log(value[durationBrand], value['milliseconds']);
}
```

### Non-empty arrays

```ts
import { ensureNonEmptyArray, isNonEmptyArray } from '@pvorona/assert';

const mutableValues: number[] = [1, 2];
if (isNonEmptyArray(mutableValues)) {
  mutableValues.push(3);
}

const readonlyValues: readonly number[] = [1, 2];
const ensured = ensureNonEmptyArray(readonlyValues);
// ensured: ReadonlyNonEmptyArray<number>
```

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
