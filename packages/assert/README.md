# @pvorona/assert

ESM-only TypeScript assertions, intentionally restrictive guards, and compositional narrowing helpers.

## Install

```bash
npm i @pvorona/assert
```

## Important semantics

- The scalar/nullish `is*` and `ensure*` helpers are intentionally compile-time-restrictive. They are designed for values that still contain the member you want to narrow, not as loose `unknown -> whatever` casts.
- `defined` means `not undefined`. It does not mean `not nullish`. For DOM APIs such as `document.getElementById(...)`, use `ensureNotNull(...)`.
- The package is ESM-only. The current workspace verifies it on Node 20+ and TypeScript 5.9+.

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

### Breaking change: `resolveValueOrGetter(...)` is no longer public

`resolveValueOrGetter` is no longer exported from `@pvorona/assert`.
It now lives in a private workspace package used internally in this repo and
is not part of the published API.
External consumers should define a local equivalent if they still need the helper.

### Non-empty arrays preserve readonlyness

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

### Breaking change: `Mutable<T>` is no longer public

`Mutable` is no longer exported from `@pvorona/assert`.
It now lives in a private workspace package used internally in this repo and
is not part of the published API.
External consumers should define a local equivalent if they still need the mapped type.

## Stable public surface

- Runtime helpers: `assert`, `AssertionError`, the root `is*` / `ensure*` helpers, `isPromiseLike`, `hasOwnKey`, and `hasOwnPropertyValue`
- Public types: `NonEmptyArray` and `ReadonlyNonEmptyArray`

## ESM and tooling

- Import the package with standard ESM syntax: `import { assert } from '@pvorona/assert'`
- Import types with `import type`, for example `import type { ReadonlyNonEmptyArray } from '@pvorona/assert'`
- The current workspace baseline is Node 20+ and TypeScript 5.9+

## Migration note

The root package no longer re-exports some advanced helpers from the old internal surfaces.

- `resolveValueOrGetter` moved to a private workspace package and is no longer part of the published API
- `Mutable` moved to a private workspace package and is no longer part of the published API
- External consumers should define local equivalents if they still need either helper
- Removed root exports include internal-looking helpers such as `Override`, `InferErrorMessage`, `NotOnly*`, `Includes*`, `AtLeastOneValid`, and `InferArrayType`
- `NonEmptyArray` and `ReadonlyNonEmptyArray` remain public
- There is no replacement public subpath for the removed advanced types; if you still need them, define local equivalents in your own codebase
