# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

Use `@pvorona/failable` when failure is part of normal control flow: invalid
input, missing config, not found, or a dependency call that can fail. Return a
`Failable<T, E>` instead of throwing, then handle the result explicitly.

A `Failable<T, E>` is either `Success<T>` or `Failure<E>`.

- `success(...)` / `failure()` / `failure(...)` create results
- `failable(...)` captures thrown or rejected boundaries
- `run(...)` composes multiple `Failable` steps

## Install

```bash
npm i @pvorona/failable
```

This package is ESM-only and requires Node 18+.

## Migration Note

If you are upgrading from the previous API name:

- `createFailable(x)` -> `failable(x)`
- `CreateFailableNormalizeErrorOptions` -> `FailableNormalizeErrorOptions`
- `result.isError` -> `result.isFailure`
- `.error` is unchanged
- `failure(...)`, `Failure<E>`, `throwIfError(...)`, and `getOrThrow()` are unchanged

## Basic Usage

Use `Failable` when a failure is expected and the caller needs to decide what to
do next. Start with the smallest mental model: return `success(...)` or
`failure(...)`, then branch on `result.isFailure`.

```ts
import { failure, success, type Failable } from '@pvorona/failable';

type ReadPortError =
  | { code: 'missing_port' }
  | { code: 'invalid_port'; value: string };

function readPort(
  env: Record<string, string | undefined>,
): Failable<number, ReadPortError> {
  const raw = env.PORT;
  if (raw === undefined) return failure({ code: 'missing_port' });

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    return failure({ code: 'invalid_port', value: raw });
  }

  return success(port);
}

const result = readPort({ PORT: '3000' });

if (result.isFailure) {
  console.error(result.error);
} else {
  console.log(`Listening on ${result.data}`);
}
```

That is the core model for this package: a typed result with a success value on
one branch and an expected failure reason on the other.

## Choose The Right API

| Need | Use |
| --- | --- |
| Return a successful or failed result from your own code | `success(...)` / `failure(...)` |
| Read the value or provide a fallback | `getOr(...)` / `getOrElse(...)` |
| Recover to `Success<T>` | `or(...)` / `orElse(...)` |
| Map both branches to one output | `match(onSuccess, onFailure)` |
| Throw the stored failure unchanged | `getOrThrow()` / `throwIfError(result)` |
| Capture a throwing or rejecting boundary | `failable(...)` |
| Compose multiple `Failable` steps | `run(...)` |
| Cross a structured-clone boundary | `toFailableLike(...)` + `failable(...)` |
| Validate `unknown` input | `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`, `isFailableLike(...)` |

## Unwrapping And Recovery

Start with ordinary branching on `result.isFailure` or `result.isSuccess`. When
you want something shorter, use the helper that matches the job:

- `result.getOr(fallback)`: return the success value or an eager fallback
- `result.getOrElse(() => fallback)`: same, but lazily
- `result.or(fallback)`: recover to `Success<T>` with an eager fallback
- `result.orElse(() => fallback)`: recover to `Success<T>` lazily
- `result.match(onSuccess, onFailure)`: map both branches to one output
- `result.getOrThrow()`: return the success value or throw `result.error`
- `throwIfError(result)`: throw `result.error` and narrow the same variable

Use the lazy forms when the fallback is expensive or has side effects.

```ts
import {
  failure,
  success,
  throwIfError,
  type Failable,
} from '@pvorona/failable';

type ReadThemeError = { code: 'missing_theme' };

function readTheme(
  env: Record<string, string | undefined>,
): Failable<string, ReadThemeError> {
  const raw = env.THEME;
  if (raw === undefined) return failure({ code: 'missing_theme' });

  return success(raw);
}

const themeResult = readTheme({ THEME: 'dark' });

const displayTheme = themeResult.getOr('light');
const label = themeResult.match(
  (value) => `Theme: ${value}`,
  () => 'Theme: light (fallback)'
);

console.log(displayTheme, label);

throwIfError(themeResult);
console.log(themeResult.data.toUpperCase());
```

## Capture Thrown Or Rejected Failures With `failable(...)`

Use `failable(...)` at a boundary you do not control. It turns a thrown or
rejected value into `Failure`, so the rest of your code can stay in normal
`Failable` flow.

Use the callback form for synchronous code that can throw:

```ts
import { failable, NormalizedErrors } from '@pvorona/failable';

const rawConfig = '{"theme":"dark"}';
const configResult = failable(() => JSON.parse(rawConfig), NormalizedErrors);

if (configResult.isFailure) {
  console.error(configResult.error.message);
} else {
  console.log(configResult.data);
}
```

`NormalizedErrors` is the built-in shortcut when you want `.error` to be an
`Error`.

Pass a promise directly when you want rejection capture:

```ts
import { failable, NormalizedErrors } from '@pvorona/failable';
import { readFile } from 'node:fs/promises';

const fileResult = await failable(
  readFile('config.json', 'utf8'),
  NormalizedErrors
);

if (fileResult.isFailure) {
  console.error(fileResult.error.message);
} else {
  console.log(fileResult.data);
}
```

`failable(...)` can:

- preserve an existing `Failable`
- rehydrate a `FailableLike`
- capture sync throws from a callback
- capture promise rejections from a promise
- normalize failures with `NormalizedErrors` or a custom `normalizeError(...)`

By default, the thrown or rejected value becomes `.error` unchanged.

Pass the promise itself when you want rejection capture.
`failable(async () => value)` is misuse and returns a `Failure<Error>` telling
you to pass the promise directly instead.

## Compose Existing `Failable` Steps With `run(...)`

Use `run(...)` when each step already returns `Failable` and you want to write
the success path once. If any yielded step fails, `run(...)` returns that same
failure unchanged.

```ts
import { failure, run, success, type Failable } from '@pvorona/failable';

type LoadDashboardError =
  | { code: 'missing_user_id' }
  | { code: 'user_not_found'; id: string }
  | { code: 'beta_disabled' };

function readUserId(
  raw: string | undefined,
): Failable<string, LoadDashboardError> {
  if (raw === undefined) return failure({ code: 'missing_user_id' });

  return success(raw);
}

function findUser(
  id: string,
): Failable<{ id: string; hasBetaAccess: boolean }, LoadDashboardError> {
  if (id !== 'user_123' && id !== 'user_456') {
    return failure({ code: 'user_not_found', id });
  }

  return success({ id, hasBetaAccess: id === 'user_123' });
}

function loadDashboard(
  rawUserId: string | undefined,
): Failable<{ userId: string }, LoadDashboardError> {
  return run(function* ({ get }) {
    const userId = yield* get(readUserId(rawUserId));
    const user = yield* get(findUser(userId));
    if (!user.hasBetaAccess) return failure({ code: 'beta_disabled' });

    return success({ userId: user.id });
  });
}
```

Keep these rules in mind:

- `run(...)` composes existing `Failable` values
- if a yielded step fails, `run(...)` returns that original failure unchanged
- in async builders, keep using `yield* get(...)`; do not write `await get(...)`
- `run(...)` does not capture thrown values or rejected promises into `Failure`
- wrap throwing or rejecting boundaries with `failable(...)` before they
  enter `run(...)`

## Transport And Runtime Validation

`Failable` values are hydrated objects with methods. Keep them inside your
process. If you need a structured-clone-friendly shape, convert to
`FailableLike<T, E>` before crossing the boundary and rehydrate on the other
side:

```ts
import {
  failure,
  failable,
  toFailableLike,
} from '@pvorona/failable';

const result = failure({ code: 'missing_port' as const });

const wire = toFailableLike(result);
const hydrated = failable(wire);
```

Use the runtime guards only when the input did not come from your own local
control flow:

```ts
import { isFailable } from '@pvorona/failable';

const candidate: unknown = maybeFromAnotherModule();

if (isFailable(candidate) && candidate.isFailure) {
  console.error(candidate.error);
}
```

- use `isFailable(...)`, `isSuccess(...)`, and `isFailure(...)` for `unknown`
  values that might already be hydrated `Failable` results
- use `isFailableLike(...)` for plain transport shapes like
  `{ status, data }` or `{ status, error }`

## API At A Glance

- `type Failable<T, E>`: `Success<T> | Failure<E>`
- `type Success<T>` / `type Failure<E>`: hydrated result variants
- `type FailableLike<T, E>`: structured-clone-friendly wire shape
- `success()` / `success(data)` / `failure()` / `failure(error)`: create hydrated results
- `throwIfError(result)` / `result.getOrThrow()`: throw the stored failure
  unchanged
- `failable(...)`: preserve, rehydrate, capture, or normalize failures at
  a boundary
- `run(...)`: compose `Failable` steps without nested branching
- `toFailableLike(...)`: convert a hydrated result into a wire shape
- `isFailableLike(...)`: validate a wire shape
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: validate hydrated
  results
- `NormalizedErrors`: built-in `Error` normalization for `failable(...)`
- `FailableStatus`: runtime success/failure status values
