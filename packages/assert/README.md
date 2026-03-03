# @pvorona/assert

Type-safe assertions, type guards, and narrowing helpers with compile-time misuse prevention.

## `assert`

```ts
import { assert } from '@pvorona/assert';

assert(user.age >= 18, 'Must be an adult');
// user.age is narrowed, stack trace points at the call site
```

## Type guards (`is*`)

Produce compile-time errors when called on types that make the check meaningless (e.g. `isString` on a value already known to be `string`).

```ts
import { isString, isNumber, isNull, isDefined, isNonEmptyArray } from '@pvorona/assert';

function format(value: string | number) {
  if (isString(value)) return value.toUpperCase();

  return value.toFixed(2);
}

const items: number[] = [];
if (isNonEmptyArray(items)) {
  items[0]; // number — guaranteed to exist
}
```

Full list: `isString`, `isNumber`, `isSymbol`, `isNull`, `isNotNull`, `isUndefined`, `isDefined`, `isNullOrUndefined`, `isFunction`, `isObject`, `isArray`, `isEmptyArray`, `isNonEmptyArray`, `isPositive`, `isNegative`, `isInteger`.

## Narrowing helpers (`ensure*`)

Assert and return the narrowed value, or throw.

```ts
import { ensureDefined, ensureNotNullOrUndefined, ensureNever } from '@pvorona/assert';

const el = ensureDefined(document.getElementById('root'));
// el: HTMLElement — throws if undefined

const name = ensureNotNullOrUndefined(user.name);
// name: string — throws if null or undefined

type Status = 'active' | 'inactive';
function label(status: Status) {
  switch (status) {
    case 'active': return 'On';
    case 'inactive': return 'Off';
    default: ensureNever(status); // compile error if a case is missing
  }
}
```

Full list: `ensureDefined`, `ensureNotNull`, `ensureNotNullOrUndefined`, `ensureString`, `ensureNumber`, `ensureArray`, `ensureNonEmptyArray`, `ensureObject`, `ensureNever`.
