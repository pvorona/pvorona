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
Inside this workspace, current consumers now import it from the private
`@pvorona/resolve-value-or-getter` package.

```ts
// Workspace-internal migration only
import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';

const fallback = Math.random() > 0.5 ? 'cached' : () => 'computed';
const value = resolveValueOrGetter(fallback);
// value: string
```

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

### `Mutable<T>`

```ts
import type { Mutable } from '@pvorona/assert';

type Config = {
  readonly retries: number;
  readonly label: string;
};

type DraftConfig = Mutable<Config>;
// { retries: number; label: string }
```

## Stable public surface

- Runtime helpers: `assert`, `AssertionError`, the root `is*` / `ensure*` helpers, `isPromiseLike`, `hasOwnKey`, and `hasOwnPropertyValue`
- Public types: `Mutable`, `NonEmptyArray`, and `ReadonlyNonEmptyArray`

## ESM and tooling

- Import the package with standard ESM syntax: `import { assert } from '@pvorona/assert'`
- Import types with `import type`, for example `import type { Mutable } from '@pvorona/assert'`
- The current workspace baseline is Node 20+ and TypeScript 5.9+

## Migration note

The root package no longer re-exports some advanced helpers from the old internal surfaces.

```ts
// Before
import { resolveValueOrGetter } from '@pvorona/assert';
import type { Mutable, Override, NotOnlyString } from '@pvorona/assert';

// After (workspace-internal helper import)
import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';
import type { Mutable } from '@pvorona/assert';
```

- `resolveValueOrGetter` moved to the private workspace package `@pvorona/resolve-value-or-getter`
- External consumers should stop importing `resolveValueOrGetter` from `@pvorona/assert` and define a local equivalent if they still need the helper
- Removed root exports include internal-looking helpers such as `Override`, `InferErrorMessage`, `NotOnly*`, `Includes*`, `AtLeastOneValid`, and `InferArrayType`
- `Mutable`, `NonEmptyArray`, and `ReadonlyNonEmptyArray` remain public
- There is no replacement public subpath for the removed advanced types; if you still need them, define local equivalents in your own codebase
