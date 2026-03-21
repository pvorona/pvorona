# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

Use `@pvorona/failable` when failure is part of normal control flow: invalid
input, missing config, not found, or a dependency call that can fail. Return a
`Failable<T, E>` instead of throwing, then handle the result explicitly.

A `Failable<T, E>` is either `Success<T>` or `Failure<E>`.

- `success()` / `success(data)` / `failure()` / `failure(error)` create results
- `failable(...)` captures thrown or rejected boundaries
- `run(...)` composes multiple `Failable` steps

## Install

```bash
npm i @pvorona/failable
```

This package is ESM-only and requires Node 18+.

## Basic Usage

Return `success(...)` or `failure(...)`, then branch on `result.isFailure`.
The typed error lets the caller decide what to do for each failure reason.

```ts
import { failure, success, type Failable } from '@pvorona/failable';

type ReadPortError =
  | { code: 'missing' }
  | { code: 'invalid'; raw: string };

function readPort(raw: string | undefined): Failable<number, ReadPortError> {
  if (raw === undefined) return failure({ code: 'missing' });

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    return failure({ code: 'invalid', raw });
  }

  return success(port);
}

const result = readPort(process.env.PORT);

if (result.isFailure) {
  switch (result.error.code) {
    case 'missing':
      console.error('PORT is not set');
      break;
    case 'invalid':
      console.error(`PORT is not a valid number: ${result.error.raw}`);
      break;
  }
} else {
  console.log(`Listening on ${result.data}`);
}
```

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

Using `readPort` from above:

```ts
const result = readPort(process.env.PORT);

const port = result.getOr(3000);
const label = result.match(
  (port) => `Listening on ${port}`,
  (error) => `Using default port (${error.code})`
);
```

`throwIfError` narrows the result to `Success` in place, so
subsequent code can access `.data` without branching:

```ts
import { throwIfError } from '@pvorona/failable';

const result = readPort(process.env.PORT);

throwIfError(result);
console.log(result.data * 2);
```

## Capture Thrown Or Rejected Failures With `failable(...)`

Use `failable(...)` at a boundary you do not control. It turns a thrown or
rejected value into `Failure`, so the rest of your code can stay in normal
`Failable` flow.

Use the callback form for synchronous code that can throw:

```ts
import { failable, NormalizedErrors } from '@pvorona/failable';

const rawConfig = '{"theme":"dark"}';
// `JSON.parse` is typed as `any`, so the callback overload is a `Failable | Promise<Failable>` union.
// `await Promise.resolve(...)` normalizes to a single Promise (plain `await` also works).
const configResult = await Promise.resolve(
  failable(() => JSON.parse(rawConfig), NormalizedErrors)
);

if (configResult.isFailure) {
  console.error(configResult.error.message);
} else {
  console.log(configResult.data);
}
```

When the callback is typed as **purely** `PromiseLike`-returning (including
`async` functions), the result type is `Promise<Failable<...>>`:

```ts
const text = '{"theme":"dark"}';
const asyncResult = await failable(async () => JSON.parse(text));
const promisedResult = await failable(() => Promise.resolve(JSON.parse(text)));
```

`NormalizedErrors` is the built-in shortcut when you want `.error` to be an
`Error`.

Pass a promise directly when you want rejection capture (equivalent to the
promise-returning callback form above, when you already have the promise):

```ts
import { failable, NormalizedErrors } from '@pvorona/failable';
import { readFile } from 'node:fs/promises';

const fileResult = await failable(
  readFile('config.json', 'utf8'),
  NormalizedErrors
);

const config = fileResult.getOr('{}');
```

`failable(...)` can:

- preserve an existing `Failable`
- rehydrate a `FailableLike`
- capture sync throws from a callback
- capture async rejections from `async` callbacks or callbacks that return a
  `PromiseLike`
- capture promise rejections from a promise passed directly
- normalize failures with `NormalizedErrors` or a custom `normalizeError(...)`

By default, the thrown or rejected value becomes `.error` unchanged.

If the callback’s return type may be synchronous **or** `PromiseLike` (for
example `T | Promise<T>`, `unknown`, or `any`), TypeScript models the result as
`Failable<...> | Promise<Failable<...>>` so you cannot treat it as always
thenable. Use `await Promise.resolve(result)` (or an explicit non-`any` /
non-`unknown` return type on the callback) when you want a single Promise.

## Compose Existing `Failable` Steps With `run(...)`

Use `run(...)` when each step already returns `Failable` and you want to write
the success path once. If any yielded step fails, `run(...)` returns that same
failure unchanged.

Inside a `run(...)` builder, there are two valid delegation forms:

- `yield* result` when `result` is already a hydrated `Failable`
- `yield* get(source)` when the helper is still needed, especially for promised
  sources

Hydrated `Failable` values are sync-iterable only so `run(...)` can intercept
`yield* result`. Outside `run(...)`, treat them as result objects rather than as
a general-purpose collection API.

Without `run(...)`, composing steps means checking each result before
continuing:

```ts
import { failure, success, type Failable } from '@pvorona/failable';

type ConfigError =
  | { code: 'missing'; key: string }
  | { code: 'invalid'; key: string; raw: string };

function readEnv(
  key: string,
  env: Record<string, string | undefined>,
): Failable<string, ConfigError> {
  const raw = env[key];
  if (raw === undefined) return failure({ code: 'missing', key });

  return success(raw);
}

function parsePort(raw: string): Failable<number, ConfigError> {
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    return failure({ code: 'invalid', key: 'PORT', raw });
  }

  return success(port);
}

function loadConfig(
  env: Record<string, string | undefined>,
): Failable<{ host: string; port: number }, ConfigError> {
  const hostResult = readEnv('HOST', env);
  if (hostResult.isFailure) return hostResult;

  const rawPortResult = readEnv('PORT', env);
  if (rawPortResult.isFailure) return rawPortResult;

  const portResult = parsePort(rawPortResult.data);
  if (portResult.isFailure) return portResult;

  return success({ host: hostResult.data, port: portResult.data });
}
```

With `run(...)`, the same flow stays linear:

```ts
import { run, success, type Failable } from '@pvorona/failable';

function loadConfig(
  env: Record<string, string | undefined>,
): Failable<{ host: string; port: number }, ConfigError> {
  return run(function* () {
    const host = yield* readEnv('HOST', env);
    const rawPort = yield* readEnv('PORT', env);
    const port = yield* parsePort(rawPort);

    return success({ host, port });
  });
}
```

- if a yielded step fails, `run(...)` returns that original failure unchanged
- use `yield* result` for already-materialized `Failable` values
- keep using `yield* get(...)` for promised sources and other cases where the
  helper is still needed; do not write `await get(...)`
- the direct `yield* result` form works only because hydrated `Failable` values
  are sync-iterable for `run(...)`; it is not a collection API outside that flow
- `run(...)` does not capture thrown values or rejected promises into `Failure`;
  wrap throwing boundaries with `failable(...)` before they enter `run(...)`

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

const result = failure({ code: 'missing' as const });

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
