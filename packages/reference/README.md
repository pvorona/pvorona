# @pvorona/reference

A mutable value container with safe access patterns.

## Install

```bash
npm i @pvorona/reference
```

## Usage

```ts
import { createReference } from '@pvorona/reference';

const config = createReference<string | undefined>(undefined);

config.set('production');
config.getOrThrow();      // 'production'
config.getOr('default');  // 'production'
config.unset();
config.getOr('default');  // 'default'
config.getOrThrow();      // throws — reference is not set
```

### Lazy initialization

```ts
const connection = createReference<Connection | undefined>(undefined);

// Sets and returns value on first call, returns cached value after
const conn = connection.getOrSet(() => createConnection());
```

### Readonly view

```ts
const ref = createReference(42);
const readonly = ref.asReadonly();

readonly.getOrThrow(); // 42
```

## API

### `type ReadonlyReference<T>`

A readonly “view” of a reference. It exposes only safe reads:

- `getOr(valueOrGetter)` — return the current value if set, otherwise return the provided fallback value (or call the fallback getter)
- `getOrThrow(messageOrFactory?)` — return the current value if set, otherwise throw

Example:

```ts
import type { ReadonlyReference } from '@pvorona/reference';

export function readEnv(mode: ReadonlyReference<'dev' | 'prod'>) {
  return mode.getOr('dev');
}
```

### `type Reference<T>`

A mutable reference with safe reads + mutation.

It includes everything from `ReadonlyReference<T>`, plus:

- `getOrSet(valueOrGetter)` — if set, return current value; otherwise set to the provided value (or getter result) and return it
- `set(value)` — set the current value
- `unset()` — clear the current value (future reads behave as “not set”)
- `asReadonly()` — get a `ReadonlyReference<T>` view

Example:

```ts
import type { Reference } from '@pvorona/reference';

export function reset<T>(ref: Reference<T>, value: T) {
  ref.set(value);
}
```

### `createReference<T>(initialValue: T): Reference<T>`

Creates a new reference.

- The reference starts “set” to `initialValue`.
- Calling `unset()` transitions it to “not set” (reads require fallback or throw).

Example:

```ts
import { createReference } from '@pvorona/reference';

const token = createReference<string | undefined>(undefined);

token.getOr(''); // ''
token.set('abc');
token.getOrThrow(); // 'abc'
token.unset();
```
