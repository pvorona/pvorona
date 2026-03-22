# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

Use `@pvorona/failable` when failure is part of normal control flow: invalid
input, missing config, not found, or a dependency call that can fail. Return a
`Failable<T, E>` instead of throwing, then handle the result explicitly.

A `Failable<T, E>` is either `Success<T>` or `Failure<E>`.

- `success()` / `success(data)` / `failure()` / `failure(error)` create results
- `failable(...)` captures thrown or rejected boundaries
- `run(...)` composes multiple `Failable` steps
- `all(...)`, `allSettled(...)`, and `race(...)` combine multiple sources
- `result.map(...)` / `result.flatMap(...)` transform and chain success values

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
| Throw an `Error` from a failure | `getOrThrow(normalizeOption?)` / `throwIfFailure(result, normalizeOption?)` |
| Capture a throwing or rejecting boundary | `failable(...)` |
| Compose multiple `Failable` steps | `run(...)` |
| Combine multiple `Failable` sources | `all(...)`, `allSettled(...)`, `race(...)` |
| Transform a successful value only | `map(...)` |
| Chain another `Failable` step | `flatMap(...)` |
| Cross a structured-clone boundary | `toFailableLike(...)` + `failable(...)` |
| Validate `unknown` input | `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`, `isFailableLike(...)` |

## Unwrapping And Recovery

Start with ordinary branching on `result.isFailure` or `result.isSuccess`. When
you want something shorter, use the helper that matches the job:

- `result.getOr(fallback)`: return the success value or an eager fallback
- `result.getOrElse(() => fallback)`: lazy fallback
- `result.getOrElse((error) => fallback)`: lazy fallback derived from the failure
- `result.or(fallback)`: recover to `Success<T>` with an eager fallback
- `result.orElse(() => fallback)`: lazy recovery to `Success<T>`
- `result.orElse((error) => fallback)`: lazy recovery to `Success<T>` derived from the failure
- `result.match(onSuccess, onFailure)`: map both branches to one output
- `result.getOrThrow(normalizeOption?)`: return the success value or throw an `Error` derived from the failure
- `throwIfFailure(result, normalizeOption?)`: throw an `Error` derived from the failure and narrow the same variable

Both throw helpers preserve existing `Error` instances unchanged by default.
Other failure values are normalized with the built-in rules: arrays become
`AggregateError`; plain objects become `Error` with `cause`; primitives and
`undefined` become `Error(String(value), { cause: value })`.

Pass `NormalizedErrors` or a custom `normalizeError(...)` when you need a
specific `Error` shape at the throw boundary. Normalize earlier with
`failable(...)` only when you need that normalized `Error` inside the
`Failure` channel before anything throws. If built-in message derivation
itself fails, normalization still returns an `Error` with message
`Unstringifiable error value` and `cause` set to the original raw value.

Use the lazy forms when the fallback is expensive or has side effects. Failure
callbacks always receive the stored error, so `() => ...` can ignore it and
`(error) => ...` can use it:

```ts
const port = result.getOrElse((error) => {
  return error.code === 'missing' ? 3000 : 8080;
});
```

Using `readPort` from above:

```ts
const result = readPort(process.env.PORT);

const port = result.getOr(3000);
const label = result.match(
  (port) => `Listening on ${port}`,
  (error) => `Using default port (${error.code})`
);
```

`throwIfFailure` narrows the result to `Success` in place, so
subsequent code can access `.data` without branching:

```ts
import { throwIfFailure } from '@pvorona/failable';

const result = readPort(process.env.PORT);

throwIfFailure(result);
console.log(result.data * 2);
```

When you want a specific `Error` shape only at the throw site, pass the
normalize option there:

```ts
import { NormalizedErrors } from '@pvorona/failable';

const port = readPort(process.env.PORT).getOrThrow(NormalizedErrors);
```

## Transform And Chain With `map(...)` And `flatMap(...)`

Use `result.map(fn)` when you only need to change the success value. The callback
runs on `Success` only; on `Failure`, the same failure is returned unchanged.

Use `result.flatMap(fn)` when the next step can fail again. The callback must
return another `Failable`. On `Success`, that result becomes the outcome; on
`Failure`, `flatMap` short-circuits and keeps the original error.

Building on `readPort` from [Basic Usage](#basic-usage):

```ts
import { failure, success, type Failable } from '@pvorona/failable';

type ReadPortError =
  | { code: 'missing' }
  | { code: 'invalid'; raw: string };

type ApplicationPortError =
  | ReadPortError
  | { code: 'not_application_port'; port: number };

function readPort(raw: string | undefined): Failable<number, ReadPortError> {
  if (raw === undefined) return failure({ code: 'missing' });

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    return failure({ code: 'invalid', raw });
  }

  return success(port);
}

function ensureApplicationPort(
  port: number,
): Failable<number, ApplicationPortError> {
  if (port < 3000 || port > 3999) {
    return failure({ code: 'not_application_port', port });
  }

  return success(port);
}

const appPortResult = readPort(process.env.PORT).flatMap((port) =>
  ensureApplicationPort(port),
);

const labelResult = appPortResult.map(
  (port) => `Application listening on ${port}`,
);
```

When you pass object literals directly into `success(...)` or `failure(...)`,
TypeScript often keeps their types as narrow as possible (literal fields where
that makes sense), which helps `switch` on `error.code` and similar patterns.

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
`Error`, including when the thrown or rejected non-`Error` value cannot be
stringified safely.

Pass a promise directly when you want rejection capture:

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
- capture promise rejections from a promise passed directly
- normalize failures with `NormalizedErrors` or a custom `normalizeError(...)`

By default, the thrown or rejected value becomes `.error` unchanged.

Pass the promise itself when you want rejection capture. In TypeScript,
obviously promise-returning callbacks like `async () => ...` and
`() => Promise.resolve(...)` are rejected. JS callers, plus `any`/`unknown`-typed
callbacks, receive a `Failure<Error>` telling them to pass the promise directly
instead.

## Compose Existing `Failable` Steps With `run(...)`

Use `run(...)` when each step already returns `Failable` and you want to write
the success path once. If any yielded step fails, that failure becomes the
default unwind result. Cleanup still runs first, and an explicit `return`
reached in `finally` overrides it. Yielded cleanup `Failure` values keep the
current unwind result unless a later cleanup `return` overrides it.

Inside a `run(...)` builder, there are two valid delegation forms:

- `yield* result` when `result` is already a hydrated `Failable`
- `yield* await promisedResult` in async builders when you have a
  `Promise<Failable<...>>`

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

When a helper already returns a hydrated `Failable`, yield it directly with
`yield* helper()`. For promised sources in async builders, await them first and
then yield the hydrated result with `yield* await promisedHelper()`.

`run(...)` does not inject helper arguments. Import the top-level combinators
you need and use them directly inside the builder.

For async flows, switch to `run(async function* ...)`. Sync hydrated helpers
still work with direct `yield* helper()`, and promised sources compose with
`yield* await ...`:

```ts
import {
  all,
  failable,
  failure,
  run,
  success,
  type Failable,
} from '@pvorona/failable';

type ApiError =
  | { code: 'network_error'; cause: unknown }
  | { code: 'http_error'; status: number }
  | { code: 'json_parse_error'; cause: unknown };

type User = { id: string; email: string };
type Profile = { id: string; pictureUrl: string };

async function readJson<T>(url: string) {
  const responseResult = await failable(fetch(url));
  if (responseResult.isFailure) {
    return failure({ code: 'network_error', cause: responseResult.error });
  }

  const response = responseResult.data;
  if (!response.ok) {
    return failure({ code: 'http_error', status: response.status });
  }

  const jsonResult = await failable(response.json());
  if (jsonResult.isFailure) {
    return failure({ code: 'json_parse_error', cause: jsonResult.error });
  }

  return success(jsonResult.data as T);
}

async function getUser(userId: string) {
  return readJson<User>(`https://api.example.com/users/${userId}`);
}

async function getUserProfile(userId: string) {
  return readJson<Profile>(`https://api.example.com/users/${userId}/profile`);
}

async function loadUserPage(
  userId: string,
): Promise<Failable<{ user: User; profile: Profile }, ApiError>> {
  return await run(async function* () {
    const [user, profile] = yield* await all(
      getUser(userId),
      getUserProfile(userId)
    );

    return success({ user, profile });
  });
}
```

- if a yielded step fails, that failure becomes the default unwind result
- cleanup still runs, and the last explicit `return` reached in `finally` wins
- yielded cleanup `Failure` values keep the current unwind result unless a
  later cleanup `return` overrides it
- sync hydrated `Failable` helpers can use direct `yield* helper()` in both sync
  and async builders
- promised sources in async builders use `yield* await promisedHelper()`
- in async builders, use `yield* await all(...)` to run multiple sources in
  parallel and get a success tuple or the first failure
- use `yield* all(...)` in sync builders when every source is already a hydrated
  `Failable`
- use `await allSettled(...)` to inspect the settled tuple of `Failable`
  results, including promise rejections captured as `Failure` values
- use `yield* await race(...)` to take the first promised `Failable` to settle
- direct promised sources still follow normal async `await` / `try` /
  `finally` semantics rather than a helper-managed rejection path
- `run(...)` does not capture thrown values or rejected promises into `Failure`;
  wrap throwing boundaries with `failable(...)` before they enter `run(...)`

## Parallel Combinators

Import `all(...)`, `allSettled(...)`, and `race(...)` from the package root when
you want to combine multiple sources outside `run(...)` or inside async
builders.

```ts
import {
  all,
  allSettled,
  race,
  success,
  type Failable,
} from '@pvorona/failable';

const syncTuple = all(success(1), success('two'));
const mixedTuple = await all(
  success(1),
  Promise.resolve(success('two'))
);

const missingProfileSource: Promise<Failable<never, 'missing-profile'>> =
  Promise.resolve().then(() => {
    throw 'missing-profile';
  });

const settled = await allSettled(
  Promise.resolve(success(1)),
  missingProfileSource
);

const winner = await race(
  Promise.resolve(success('fast')),
  Promise.resolve(success('slow'))
);
```

Key semantics:

- `all(...)` returns the first failure in input order
- `allSettled(...)` returns a plain settled tuple rather than a `Success` wrapper
- `allSettled(...)` preserves `Failure` values in the returned settled tuple
- promised source rejections in `allSettled(...)` are captured as `Failure`
  values instead of rejecting the whole combinator
- rejection payloads captured by `allSettled(...)` stay raw; they are not
  normalized
- `allSettled(...)` is intentionally closer to `Promise.allSettled(...)`
- bare `Promise.reject(...)` inputs are rejected at type level as a best-effort
  guardrail; TypeScript still cannot model arbitrary promise rejection channels
  precisely
- `race(...)` accepts promised `Failable` sources only
- `race()` with zero sources rejects with a clear error instead of hanging

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

const result = failure({ code: 'missing' });

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
- `throwIfFailure(result, normalizeOption?)` / `result.getOrThrow(normalizeOption?)`:
  throw an `Error`, preserving existing `Error` instances unchanged by default
- `failable(...)`: preserve, rehydrate, capture, or normalize failures at
  a boundary
- `run(...)`: compose `Failable` steps without nested branching
- `result.map(...)`: transform success data; failures pass through unchanged
- `result.flatMap(...)`: chain another `Failable`; failures short-circuit
- `toFailableLike(...)`: convert a hydrated result into a wire shape
- `isFailableLike(...)`: validate a wire shape
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: validate hydrated
  results
- `NormalizedErrors`: built-in `Error` normalization for `failable(...)` and
  throw-boundary helpers
- `FailableStatus`: runtime success/failure status values
