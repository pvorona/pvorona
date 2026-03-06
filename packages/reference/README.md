# @pvorona/reference

A mutable value container with explicit empty-state semantics and lazy fallback APIs.

## Install

```bash
npm i @pvorona/reference
```

## Important semantics

- `createReference(value)` always starts set, even when `value` is `undefined` or `null`.
- `createUnsetReference<T>()` is the only empty-at-start constructor.
- `undefined` and `null` are stored values, not absence.
- Functions are reserved for lazy getters and lazy initializers, so a reference cannot store a bare function value.
- `isSet` and `isUnset` are the intended presence checks.
- `asReadonly()` returns a live view of the same underlying reference.

```ts
import { createReference, createUnsetReference } from '@pvorona/reference';

const storedUndefined = createReference<string | undefined>(undefined);
storedUndefined.isSet; // true
storedUndefined.getOr('fallback'); // undefined

const emptyToken = createUnsetReference<string>();
emptyToken.isUnset; // true
emptyToken.getOr('fallback'); // 'fallback'
```

## Usage

### Lazy client initialization

```ts
import { createUnsetReference } from '@pvorona/reference';

type Connection = {
  readonly id: string;
};

declare function createConnection(): Connection;

const connection = createUnsetReference<Connection>();

const first = connection.getOrSet(() => createConnection());
const second = connection.getOrSet(() => createConnection());

first === second; // true
connection.isSet; // true
```

### Resettable token slot

```ts
import { createUnsetReference } from '@pvorona/reference';

const token = createUnsetReference<string>();

token.isUnset; // true
token.getOr(''); // ''

token.set('abc');
token.getOrThrow(); // 'abc'
token.isSet; // true

token.unset();
token.isUnset; // true
```

### Live readonly view

```ts
import { createUnsetReference } from '@pvorona/reference';

const mode = createUnsetReference<'dev' | 'prod'>();
const readonlyMode = mode.asReadonly();

mode.set('prod');

readonlyMode.isSet; // true
readonlyMode.getOr('dev'); // 'prod'
```

## API

### `type ReadonlyReference<T>`

A live readonly view of a reference.

- `isSet` / `isUnset` expose the current presence state.
- `getOr(value)` returns the stored value when set, otherwise the literal fallback.
- `getOr(() => value)` evaluates the fallback lazily only when unset.
- `getOrThrow(messageOrFactory?)` throws when the reference is unset.

### `type Reference<T>`

A mutable reference that extends the readonly API with mutation and lazy initialization.

- `getOrSet(value)` stores the literal value only when unset.
- `getOrSet(() => value)` initializes lazily only when unset.
- `set(value)` overwrites the stored value.
- `unset()` transitions the reference to the empty state.
- `asReadonly()` returns a live `ReadonlyReference<T>` view.

### `createReference<T>(initialValue: T): Reference<T>`

Creates a reference that starts set to `initialValue`.

- Passing `undefined` or `null` stores that exact value.
- Use `createUnsetReference<T>()` instead when you need an empty reference.

### `createUnsetReference<T>(): Reference<T>`

Creates a reference that starts unset.

- Use `getOr(...)`, `getOrThrow(...)`, `getOrSet(...)`, `isSet`, and `isUnset` to read or initialize it later.

## Migration

- If you previously used `createReference<T | undefined>(undefined)` to mean "empty", replace it with `createUnsetReference<T>()`.
- Storing callbacks or handlers directly in a reference is no longer supported because function inputs are reserved for lazy getters and initializers.
- If you need to keep callable behavior in a reference, wrap it in a non-callable object first.

```ts
import { createReference } from '@pvorona/reference';

const onSave = () => console.log('saved');

const handlerRef = createReference({ onSave });

handlerRef.getOrThrow().onSave();
```
