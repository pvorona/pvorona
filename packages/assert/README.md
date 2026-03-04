# @pvorona/assert

Type-safe assertions, type guards, and narrowing helpers.

## Install

```bash
npm i @pvorona/assert
```

## Usage

### `assert(...)` (throw with a clean stack trace)

```ts
import { assert } from '@pvorona/assert';

assert(user.age >= 18, 'Must be an adult');
// If it throws, the stack trace points at THIS call site.
```

### Type guards (`is*`)

```ts
import { isNonEmptyArray, isString } from '@pvorona/assert';

function format(value: string | number) {
  if (!isString(value)) return String(value);
  return value.toUpperCase();
}

const items: number[] = [];
if (isNonEmptyArray(items)) {
  items[0]; // number — guaranteed to exist
}
```

### Narrowing helpers (`ensure*`)

```ts
import { ensureDefined, ensureNever, ensureNotNullOrUndefined } from '@pvorona/assert';

const el = ensureDefined(document.getElementById('root'));
// el: HTMLElement — throws if undefined

const name = ensureNotNullOrUndefined(user.name);
// name: string — throws if null or undefined

type Status = 'active' | 'inactive';
export function label(status: Status) {
  switch (status) {
    case 'active':
      return 'On';
    case 'inactive':
      return 'Off';
    default:
      ensureNever(status); // compile error if a case is missing
  }
}
```

## API

### `assert(condition, messageOrMessageGetter?, functionToSkipStackFrames?): asserts condition`

Throws an `AssertionError` if `condition` is false.

- **`condition`**: boolean to assert
- **`messageOrMessageGetter`**: a string or lazy `() => string`
- **`functionToSkipStackFrames`**: used to hide wrapper functions from the stack trace (defaults to `assert`)

Example:

```ts
import { assert } from '@pvorona/assert';

export function parsePort(input: string): number {
  const port = Number(input);
  assert(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid port', parsePort);
  return port;
}
```

### `class AssertionError extends Error`

The error type thrown by `assert(...)`.

Example:

```ts
import { AssertionError, assert } from '@pvorona/assert';

try {
  assert(false, 'boom');
} catch (e) {
  console.log(e instanceof AssertionError); // true
}
```

### `isString(value)`

Checks `typeof value === 'string'` and narrows to `Extract<T, string>`.

Example:

```ts
import { isString } from '@pvorona/assert';

function upper(value: string | number) {
  if (!isString(value)) return String(value);
  return value.toUpperCase();
}
```

### `ensureString(value, message?): Extract<T, string>`

Asserts `isString(value)` and returns the narrowed value.

Example:

```ts
import { ensureString } from '@pvorona/assert';

const value: unknown = 'x';
ensureString(value).toUpperCase();
```

### `isNumber(value)`

Checks that `value` is a finite number (not `NaN` and not `Infinity`) and narrows to `Extract<T, number>`.

Example:

```ts
import { isNumber } from '@pvorona/assert';

const value: unknown = 123;
if (isNumber(value)) {
  value.toFixed(2);
}
```

### `ensureNumber(value, message?): Extract<T, number>`

Asserts `isNumber(value)` and returns the narrowed value.

Example:

```ts
import { ensureNumber } from '@pvorona/assert';

const value: unknown = 1;
ensureNumber(value).toFixed(2);
```

### `isSymbol(value)`

Checks `typeof value === 'symbol'`.

Example:

```ts
import { isSymbol } from '@pvorona/assert';

const maybe: unknown = Symbol('x');
if (isSymbol(maybe)) {
  maybe.description;
}
```

### `isNull(value)`

Checks `value === null`.

Example:

```ts
import { isNull } from '@pvorona/assert';

const maybe: string | null = Math.random() > 0.5 ? 'x' : null;
if (isNull(maybe)) {
  // null
}
```

### `isNotNull(value)`

Checks `value !== null` and narrows to `Exclude<T, null>`.

Example:

```ts
import { isNotNull } from '@pvorona/assert';

const values = ['a', null, 'b'];
const defined = values.filter(isNotNull); // string[]
```

### `ensureNotNull(value, message?): Exclude<T, null>`

Asserts `value !== null` and returns the narrowed value.

Example:

```ts
import { ensureNotNull } from '@pvorona/assert';

const maybe: string | null = 'x';
const value = ensureNotNull(maybe);
```

### `isUndefined(value)`

Checks `typeof value === 'undefined'`.

Example:

```ts
import { isUndefined } from '@pvorona/assert';

const maybe: string | undefined = undefined;
if (isUndefined(maybe)) {
  // undefined
}
```

### `isDefined(value)`

Checks `value !== undefined` and narrows to `Exclude<T, undefined>`.

Example:

```ts
import { isDefined } from '@pvorona/assert';

const values = ['a', undefined, 'b'];
const defined = values.filter(isDefined); // string[]
```

### `ensureDefined(value, message?): Exclude<T, undefined>`

Asserts `value !== undefined` and returns the narrowed value.

Example:

```ts
import { ensureDefined } from '@pvorona/assert';

const el = ensureDefined(document.getElementById('root'));
```

### `isNullOrUndefined(value)`

Checks `value == null` (i.e. `null` or `undefined`).

Example:

```ts
import { isNullOrUndefined } from '@pvorona/assert';

const maybe: string | null | undefined = undefined;
if (isNullOrUndefined(maybe)) {
  // null | undefined
}
```

### `ensureNotNullOrUndefined(value, message?): Exclude<T, null | undefined>`

Asserts `value != null` and returns the narrowed value.

Example:

```ts
import { ensureNotNullOrUndefined } from '@pvorona/assert';

const maybe: string | null | undefined = 'x';
const value = ensureNotNullOrUndefined(maybe);
```

### `isFunction(value)`

Checks `typeof value === 'function'`.

Example:

```ts
import { isFunction } from '@pvorona/assert';

const maybe: unknown = () => 1;
if (isFunction(maybe)) {
  maybe();
}
```

### `isObject(value)`

Checks “non-null object” (`typeof value === 'object' && value !== null`).

Example:

```ts
import { isObject } from '@pvorona/assert';

const maybe: unknown = { a: 1 };
if (isObject(maybe)) {
  console.log(maybe['a']);
}
```

### `ensureObject(value, message?)`

Asserts `isObject(value)` and returns the value.

Example:

```ts
import { ensureObject } from '@pvorona/assert';

const value: unknown = { a: 1 };
ensureObject(value)['a'];
```

### `isArray(value)`

Checks `Array.isArray(value)`.

Example:

```ts
import { isArray } from '@pvorona/assert';

const maybe: unknown = [1, 2, 3];
if (isArray(maybe)) {
  maybe.length;
}
```

### `ensureArray(value, message?): Extract<T, unknown[]>`

Asserts `isArray(value)` and returns the narrowed value.

Example:

```ts
import { ensureArray } from '@pvorona/assert';

const value: unknown = [1, 2, 3];
ensureArray(value).length;
```

### `isEmptyArray(value)`

Checks `value.length === 0` and narrows to `[]`.

Example:

```ts
import { isEmptyArray } from '@pvorona/assert';

const items: number[] = [];
if (isEmptyArray(items)) {
  // items: []
}
```

### `NonEmptyArray<T>` / `ReadonlyNonEmptyArray<T>`

Tuple-based non-empty array types (`[T, ...T[]]`) with a `map` override that preserves non-emptiness.

Example:

```ts
import type { NonEmptyArray } from '@pvorona/assert';

const xs: NonEmptyArray<number> = [1, 2, 3];
const ys = xs.map((n) => String(n)); // NonEmptyArray<string>
```

### `isNonEmptyArray(value)`

Checks `value.length > 0` and narrows to `NonEmptyArray<T>`.

Example:

```ts
import { isNonEmptyArray } from '@pvorona/assert';

const items: number[] = [1];
if (isNonEmptyArray(items)) {
  items[0]; // number (guaranteed)
}
```

### `ensureNonEmptyArray(value, message?): NonEmptyArray<T>`

Asserts `isNonEmptyArray(value)` and returns the narrowed value.

Example:

```ts
import { ensureNonEmptyArray } from '@pvorona/assert';

const items = ensureNonEmptyArray([1, 2, 3] as number[]);
items[0];
```

### `isPositive(n)`

Checks `n > 0`.

Example:

```ts
import { isPositive } from '@pvorona/assert';

isPositive(1); // true
```

### `isNegative(n)`

Checks `n < 0`.

Example:

```ts
import { isNegative } from '@pvorona/assert';

isNegative(-1); // true
```

### `isInteger(n)`

Checks `Number.isInteger(n)`.

Example:

```ts
import { isInteger } from '@pvorona/assert';

isInteger(1.5); // false
```

### `ensureNever(value: never, silent = false, message?): never`

Exhaustiveness helper for `switch`/`if` chains.

Example:

```ts
import { ensureNever } from '@pvorona/assert';

type Status = 'on' | 'off';
export function label(status: Status) {
  switch (status) {
    case 'on':
      return 'On';
    case 'off':
      return 'Off';
    default:
      ensureNever(status);
  }
}
```

### Type utilities (advanced)

These exported types power the “compile-time misuse prevention” of the guards/ensures, but you can also use them directly.

#### `Mutable<T>`

Removes `readonly` modifiers from object properties.

```ts
import type { Mutable } from '@pvorona/assert';

type A = { readonly x: number };
type B = Mutable<A>; // { x: number }
```

#### `Override<A, B>`

Replaces overlapping keys in `A` with keys from `B`.

```ts
import type { Override } from '@pvorona/assert';

type A = { a: 1; b: 2 };
type B = Override<A, { b: 'x' }>; // { a: 1; b: 'x' }
```

#### `InferErrorMessage<T, V = T>`

Extracts a human-readable message from internal error types used by this package.

```ts
import type { InferErrorMessage, NotOnlyString } from '@pvorona/assert';

type Msg = InferErrorMessage<NotOnlyString<string>>; // "Must not be string only type"
```

#### `NotOnlyNull<T>`

Rejects `null`-only types (used to prevent meaningless checks).

```ts
import type { NotOnlyNull } from '@pvorona/assert';

type Ok = NotOnlyNull<string | null>; // string | null
```

#### `NotOnlyUndefined<T>`

Rejects `undefined`-only types.

```ts
import type { NotOnlyUndefined } from '@pvorona/assert';

type Ok = NotOnlyUndefined<string | undefined>; // string | undefined
```

#### `NotOnlyNullOrUndefined<T>`

Rejects `(null | undefined)`-only types.

```ts
import type { NotOnlyNullOrUndefined } from '@pvorona/assert';

type Ok = NotOnlyNullOrUndefined<string | null | undefined>;
```

#### `NotOnlyNumber<T>`

Rejects `number`-only types.

```ts
import type { NotOnlyNumber } from '@pvorona/assert';

type Ok = NotOnlyNumber<number | 'x'>;
```

#### `NotOnlyString<T>`

Rejects `string`-only types.

```ts
import type { NotOnlyString } from '@pvorona/assert';

type Ok = NotOnlyString<string | 1>;
```

#### `NotOnlyArray<T>`

Rejects `unknown[]`-only types.

```ts
import type { NotOnlyArray } from '@pvorona/assert';

type Ok = NotOnlyArray<string[] | null>;
```

#### `NotOnlySymbol<T>`

Rejects `symbol`-only types.

```ts
import type { NotOnlySymbol } from '@pvorona/assert';

type Ok = NotOnlySymbol<symbol | string>;
```

#### `IncludesNullMember<T>`

Ensures the union includes `null`.

```ts
import type { IncludesNullMember } from '@pvorona/assert';

type Ok = IncludesNullMember<string | null>;
```

#### `IncludesUndefinedMember<T>`

Ensures the union includes `undefined`.

```ts
import type { IncludesUndefinedMember } from '@pvorona/assert';

type Ok = IncludesUndefinedMember<string | undefined>;
```

#### `IncludesNullOrUndefinedMember<T>`

Ensures the union includes `null | undefined`.

```ts
import type { IncludesNullOrUndefinedMember } from '@pvorona/assert';

type Ok = IncludesNullOrUndefinedMember<string | null | undefined>;
```

#### `IncludesNumberOrNumberLiteralMember<T>`

Ensures the union includes `number` or a number literal.

```ts
import type { IncludesNumberOrNumberLiteralMember } from '@pvorona/assert';

type Ok = IncludesNumberOrNumberLiteralMember<1 | 'x'>;
```

#### `IncludesStringOrStringLiteralMember<T>`

Ensures the union includes `string` or a string literal.

```ts
import type { IncludesStringOrStringLiteralMember } from '@pvorona/assert';

type Ok = IncludesStringOrStringLiteralMember<'x' | 1>;
```

#### `IncludesArrayOrArrayLiteralMember<T>`

Ensures the union includes an array type.

```ts
import type { IncludesArrayOrArrayLiteralMember } from '@pvorona/assert';

type Ok = IncludesArrayOrArrayLiteralMember<string[] | null>;
```

#### `IncludesSymbolMember<T>`

Ensures the union includes `symbol`.

```ts
import type { IncludesSymbolMember } from '@pvorona/assert';

type Ok = IncludesSymbolMember<symbol | string>;
```

#### `AtLeastOneValid<T>`

Used internally to ensure some union member is “valid” (not an internal error marker).

```ts
import type { AtLeastOneValid, NotOnlyString } from '@pvorona/assert';

type Ok = AtLeastOneValid<NotOnlyString<string | number>>;
```

#### `InferArrayType<T>`

Extracts the element array type.

```ts
import type { InferArrayType } from '@pvorona/assert';

type T = InferArrayType<Array<number>>; // number[]
```
