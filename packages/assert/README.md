# @pvorona/assert

Use `@pvorona/assert` for runtime assertions, nullish narrowing, object and property checks, and a few small array and number helpers in TypeScript code.

## Install and import

```bash
npm i @pvorona/assert
```

- Import runtime helpers with standard ESM syntax, for example `import { assert } from '@pvorona/assert'`
- Import public types with `import type`, for example `import type { AssertionFailure } from '@pvorona/assert'`
- The published package is ESM-only
- The published package requires Node `>=20`
- This repo currently verifies the package with TypeScript `5.9+`

## When this package fits

- Use it to throw on impossible states with `assert(...)` or `ensure*` helpers.
- Use it to narrow existing unions such as `string | number`, `T | undefined`, or `T | null | undefined`.
- Use it when you want small reusable checks like `hasOwnPropertyValue(...)`, `isPromiseLike(...)`, or `ensureArray(...)`.

Most helpers are mainly for narrowing values that already include the member you want to keep. They are not meant to act like loose `unknown -> whatever` casts. `isError(...)` is the deliberate exception for caught errors and other boundary inputs typed as `unknown` or `any`.

`defined` means `not undefined`. It does not mean `not nullish`, so use `ensureNotNull(...)` or `ensureNotNullOrUndefined(...)` when those match the actual input shape better.

## Quick start

### Throw on impossible state with `assert(...)`

`assert(condition, failure?, functionToSkipStackFrames?)` takes a boolean condition. If the condition is `false`, it throws either `AssertionError` or the caller-provided `Error`. When `failure` is a `string` or `() => string`, the thrown `AssertionError.message` matches the provided string exactly. If `functionToSkipStackFrames` is omitted, `assert` omits its own frame from the captured stack trace by default.

`failure` supports these shapes:

- `string`
- `() => string`
- `Error`
- `() => Error`

The function form is lazy and only runs on failure. Return the message or error from the callback instead of throwing it directly if you want `functionToSkipStackFrames` to apply consistently.

```ts
import { assert } from '@pvorona/assert';

export function parsePort(input: string): number {
  const port = Number(input);

  assert(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid port');

  return port;
}
```

### Throw a custom error with `assert(...)`

Prefer the function form for custom errors when construction is non-trivial or should stay off the success path.

```ts
import { assert } from '@pvorona/assert';

assert(user != null, () => new MissingUserError('User is required'));
```

Passing `Error` directly or via a callback preserves the caller-provided error instance.

This unified `failure` contract applies to `assert(...)` only. The `ensure*` helpers keep their existing contracts.

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

### Narrow caught errors and boundary inputs

```ts
import { isError } from '@pvorona/assert';

function formatProblem(problem: Error | string): string {
  if (!isError(problem)) return problem.toUpperCase();

  return problem.message;
}

function messageFromUnknown(value: unknown): string {
  if (!isError(value)) return 'Unknown failure';

  return value.message;
}
```

`isError(...)` accepts `unknown` and `any` as boundary inputs. `unknown` narrows to `Error`; `any` is allowed but remains `any`.

## API reference

### Core assertion helpers

- `assert(condition, failure?, functionToSkipStackFrames?)`: asserts a boolean condition; string-based failures preserve the exact message, caller-provided `Error` values pass through, and omitting `functionToSkipStackFrames` omits `assert` from captured stack traces by default
- `AssertionFailure`: public `assert(...)` input contract, `undefined | string | Error | (() => string | Error)`
- `AssertionError`: error class used by failed `assert(...)` calls
- `ensureNever(value, silent?, message?)`: throws plain `Error` for exhaustive-check failures unless `silent` is `true`

### Nullish helpers

- `isDefined(...)`: boolean type guard that narrows `T | undefined` to `T`
- `ensureDefined(...)`: narrows `T | undefined` and throws on `undefined`
- `isNull(...)`: boolean type guard for unions that include `null`
- `ensureNotNull(...)`: narrows `T | null` and throws on `null`
- `isUndefined(...)`: boolean type guard for unions that include `undefined`
- `isNullOrUndefined(...)`: boolean type guard for unions that include both `null` and `undefined`
- `ensureNotNullOrUndefined(...)`: narrows `T | null | undefined` and throws on `null` or `undefined`

### String and number helpers

- `isString(...)`: boolean type guard for unions that include `string`
- `ensureString(...)`: narrows to `string` and throws on failure
- `isNumber(...)`: boolean type guard for unions that include `number`
- `ensureNumber(...)`: narrows to `number` and throws on failure

### Object and property helpers

- `isObject(...)`: boolean type guard for non-null indexable objects
- `ensureObject(...)`: narrows to a non-null object and throws on failure
- `hasOwnKey(...)`: boolean guard for own properties on objects or functions
- `hasOwnPropertyValue(...)`: boolean guard for own data properties matching an exact value
- `isError(...)`: boolean guard for same-realm `Error` instances, including `unknown` boundary inputs and unions that include `Error` or error subtypes
- `isFunction(...)`: boolean guard for unions that already include a function member
- `isSymbol(...)`: boolean guard for unions that include `symbol`

### Array helpers

- `isArray(...)`: boolean type guard for unions that include mutable or readonly arrays
- `ensureArray(...)`: narrows to arrays and preserves readonlyness when the input is readonly

### Async helper

- `isPromiseLike(...)`: boolean guard for values that expose a callable `.then`

### Public types

- `AssertionFailure`: public union for the supported `assert(...)` failure inputs

## Behavior notes

- `isNumber(...)` and `ensureNumber(...)` reject `NaN`, `Infinity`, and `-Infinity`.
- `ensureNumber(...)` is an exception to the stricter compile-time pattern used by helpers like `isNumber(...)`: plain `number` inputs are allowed.
- `isObject(...)` and `ensureObject(...)` accept arrays but reject functions.
- `hasOwnKey(...)` and `hasOwnPropertyValue(...)` work with both objects and functions that have own properties.
- `hasOwnPropertyValue(...)` only matches own data properties. Inherited properties and getters return `false`.
- `isPromiseLike(...)` accepts object or function thenables and returns `false` if reading `.then` throws.
- `isError(...)` uses same-realm `value instanceof globalThis.Error` at runtime. Plain objects with `name` and `message` fields return `false`, and errors created in another realm also return `false`.
- `isError(...)` accepts `unknown` and `any` as boundary inputs. `unknown` narrows to `Error`; `any` remains `any`.
- `isError(...)` still follows the restrictive compile-time style for typed inputs: plain `Error`, error subtypes, and unions made only of error subtypes are rejected.
- `ensureNever(...)` is for exhaustive checks. It throws plain `Error`, not `AssertionError`, and `silent = true` skips throwing.
- `assert(...)` preserves string messages exactly for both `string` and `() => string` failures.
- Omitting `functionToSkipStackFrames` makes `assert(...)` omit its own frame from the captured stack trace by default.
- The unified `AssertionFailure` input and caller-provided custom-error support apply to `assert(...)`, not the `ensure*` helpers.
- `isFunction(...)` is most useful when the union already contains a function member.
- `isSymbol(...)` expects the broad `symbol` type in the input union.
- `isNullOrUndefined(...)` and `ensureNotNullOrUndefined(...)` expect unions that include both `null` and `undefined`.

## Array helpers

`isArray(...)` and `ensureArray(...)` accept mutable and readonly arrays. `ensureArray(...)` preserves readonlyness when the input is readonly.

```ts
import { ensureArray } from '@pvorona/assert';

const values = ['1', '2'] as readonly string[] | string;
const ensured = ensureArray(values);
// ensured: readonly string[]
```

## Restrictive helper contracts

```ts
import { ensureDefined, ensureNotNullOrUndefined } from '@pvorona/assert';

const port: null | string | undefined = process.env['PORT'];
const definedPort = ensureNotNullOrUndefined(port);

const fallbackPort: string | undefined = process.env['FALLBACK_PORT'];
const requiredFallbackPort = ensureDefined(fallbackPort);

// Not the same contract:
// ensureNotNullOrUndefined(fallbackPort)
// Use ensureDefined(...) for T | undefined and ensureNotNull(...) for T | null.
```

## Migration notes

The root package no longer re-exports some advanced helpers from older internal surfaces.

- `resolveValueOrGetter` moved to a private workspace package and is no longer part of the published API
- `Mutable` moved to a private workspace package and is no longer part of the published API
- External consumers should define local equivalents if they still need either helper
- Removed root exports include internal-looking helpers such as `Override`, `InferErrorMessage`, `NotOnly*`, `Includes*`, `AtLeastOneValid`, and `InferArrayType`
- There is no replacement public subpath for the removed advanced types; if you still need them, define local equivalents in your own codebase
