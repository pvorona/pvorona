# @pvorona/failable

Typed success/failure results for expected failures in TypeScript.

Use `@pvorona/failable` when failure is part of normal control flow: invalid
input, missing config, not found, or a dependency call that can fail. Return a
`Failable<T, E>` instead of throwing, then handle the result explicitly.

A `Failable<T, E>` is either `Success<T>` or `Failure<E>`.

- `success(...)` / `failure(...)` create results
- `createFailable(...)` captures thrown or rejected boundaries
- `run(...)` composes multiple `Failable` steps

## Install

```bash
npm i @pvorona/failable
```

This package is ESM-only and requires Node 18+.

## Basic Usage

Use `Failable` when callers need different behavior for different expected
failures. This is especially useful for business rules that schema validators do
not model for you:

```ts
import { failure, success, type Failable } from '@pvorona/failable';

type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
};

type TransferPlan = TransferRequest & {
  feeCents: number;
};

type TransferError =
  | { code: 'same_account' }
  | { code: 'amount_too_small'; minAmountCents: number }
  | {
      code: 'insufficient_funds';
      balanceCents: number;
      attemptedCents: number;
    };

function planTransfer(
  request: TransferRequest,
  balanceCents: number,
): Failable<TransferPlan, TransferError> {
  if (request.fromAccountId === request.toAccountId) {
    return failure({ code: 'same_account' });
  }

  if (request.amountCents < 100) {
    return failure({ code: 'amount_too_small', minAmountCents: 100 });
  }

  if (balanceCents < request.amountCents) {
    return failure({
      code: 'insufficient_funds',
      balanceCents,
      attemptedCents: request.amountCents,
    });
  }

  return success({ ...request, feeCents: 25 });
}

const result = planTransfer(
  {
    fromAccountId: 'checking',
    toAccountId: 'savings',
    amountCents: 10_000,
  },
  4_500,
);

if (result.isError) {
  switch (result.error.code) {
    case 'same_account':
      console.error('Choose a different destination account');
      break;
    case 'amount_too_small':
      console.error(`Transfers start at ${result.error.minAmountCents} cents`);
      break;
    case 'insufficient_funds':
      console.error(
        `Balance ${result.error.balanceCents} is below ${result.error.attemptedCents}`
      );
      break;
  }
} else {
  console.log(result.data.feeCents);
}
```

That is the default usage model for this package: return a typed result that
carries both the success value and the expected failure reason.

## Choose The Right API

| Need | Use |
| --- | --- |
| Return a successful or failed result from your own code | `success(...)` / `failure(...)` |
| Read the value or provide a fallback | `getOr(...)` / `getOrElse(...)` |
| Recover to `Success<T>` | `or(...)` / `orElse(...)` |
| Map both branches to one output | `match(onSuccess, onFailure)` |
| Throw the stored failure unchanged | `getOrThrow()` / `throwIfError(result)` |
| Capture a throwing or rejecting boundary | `createFailable(...)` |
| Compose multiple `Failable` steps | `run(...)` |
| Cross a structured-clone boundary | `toFailableLike(...)` + `createFailable(...)` |
| Validate `unknown` input | `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`, `isFailableLike(...)` |

## Unwrapping And Recovery

Start with ordinary branching on `result.isError` or `result.isSuccess`. When
you need a shorter form, use the helper that matches the job:

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

type QuoteError = {
  code: 'pricing_unavailable';
};

const feeResult: Failable<number, QuoteError> =
  Math.random() > 0.5
    ? success(25)
    : failure({ code: 'pricing_unavailable' });

const feeCents = feeResult.getOr(25);
const status = feeResult.match(
  (value) => `Fee is ${value} cents`,
  (error) => `Cannot quote fee: ${error.code}`
);

throwIfError(feeResult);
console.log(feeCents, status, feeResult.data);
```

## Capture Thrown Or Rejected Failures With `createFailable(...)`

Use `createFailable(...)` at boundaries that throw or reject, then convert that
failure into your domain error if needed:

Using `TransferPlan` from above:

```ts
import {
  createFailable,
  failure,
  run,
  success,
  type Failable,
} from '@pvorona/failable';

type SubmitTransferError = {
  code: 'ledger_unavailable';
};

async function postToLedger(
  plan: TransferPlan,
): Promise<Failable<{ transferId: string }, SubmitTransferError>> {
  const request = (async () => {
    if (plan.amountCents > 5_000) throw new Error('Ledger unavailable');

    return { transferId: 'tr_123' };
  })();

  const created = await createFailable(request);

  return created.match(
    (data) => success(data),
    () => failure({ code: 'ledger_unavailable' }),
  );
}

async function submitTransfer(
  plan: TransferPlan,
): Promise<Failable<{ transferId: string }, SubmitTransferError>> {
  return await run(async function* ({ get }) {
    const created = yield* get(postToLedger(plan));

    return success(created);
  });
}
```

`postToLedger(...)` is the boundary adapter. It uses
`createFailable(...)` to capture a raw throw/rejection and normalize it into the
domain error `ledger_unavailable`. Once that helper already returns `Failable`,
`submitTransfer(...)` can use `run(...)` to compose it like any other step.

Pass a promise directly when you want rejection capture:

```ts
const responseResult = await createFailable(fetch(url));
```

`createFailable(...)` can:

- preserve an existing `Failable`
- rehydrate a `FailableLike`
- capture sync throws from a callback
- capture promise rejections from a promise
- normalize failures with `NormalizedErrors` or a custom `normalizeError(...)`

By default, the thrown or rejected value becomes `.error` unchanged.

Pass the promise itself when you want rejection capture.
`createFailable(async () => value)` returns `Success<Promise<T>>`.

## Compose Existing `Failable` Steps With `run(...)`

Use `run(...)` when each step already returns `Failable` and you want to write
the success path once:

Without `run(...)`, composition often becomes an error ladder:

```ts
import { failure, success, type Failable } from '@pvorona/failable';

type Account = {
  id: string;
  balanceCents: number;
};

type TransferPlanningError =
  | TransferError
  | { code: 'source_account_not_found'; accountId: string }
  | { code: 'destination_account_not_found'; accountId: string };

function readSourceAccount(
  accountId: string,
): Failable<Account, TransferPlanningError> {
  if (accountId !== 'checking') {
    return failure({ code: 'source_account_not_found', accountId });
  }

  return success({ id: 'checking', balanceCents: 5_000 });
}

function readDestinationAccount(
  accountId: string,
): Failable<Account, TransferPlanningError> {
  if (accountId !== 'savings') {
    return failure({ code: 'destination_account_not_found', accountId });
  }

  return success({ id: 'savings', balanceCents: 20_000 });
}

function ensureDifferentAccounts(
  source: Account,
  destination: Account,
): Failable<void, TransferPlanningError> {
  if (source.id === destination.id) return failure({ code: 'same_account' });

  return success(undefined);
}

function ensureSufficientFunds(
  source: Account,
  amountCents: number,
): Failable<Account, TransferPlanningError> {
  if (source.balanceCents < amountCents) {
    return failure({
      code: 'insufficient_funds',
      balanceCents: source.balanceCents,
      attemptedCents: amountCents,
    });
  }

  return success(source);
}

function planTransfer(
  request: TransferRequest,
): Failable<TransferPlan, TransferPlanningError> {
  const source = readSourceAccount(request.fromAccountId);
  if (source.isError) return source;

  const destination = readDestinationAccount(request.toAccountId);
  if (destination.isError) return destination;

  const differentAccounts = ensureDifferentAccounts(source.data, destination.data);
  if (differentAccounts.isError) return differentAccounts;

  const fundedSource = ensureSufficientFunds(source.data, request.amountCents);
  if (fundedSource.isError) return fundedSource;

  return success({ ...request, feeCents: 25 });
}
```

With the same helpers, `run(...)` keeps the flow linear:

```ts
import { run, success, type Failable } from '@pvorona/failable';

function planTransfer(
  request: TransferRequest,
): Failable<TransferPlan, TransferPlanningError> {
  return run(function* ({ get }) {
    const source = yield* get(readSourceAccount(request.fromAccountId));
    const destination = yield* get(readDestinationAccount(request.toAccountId));
    yield* get(ensureDifferentAccounts(source, destination));
    yield* get(ensureSufficientFunds(source, request.amountCents));

    return success({ ...request, feeCents: 25 });
  });
}
```

With one async rule added, the shape stays the same:

```ts
import { failure, run, success, type Failable } from '@pvorona/failable';

type TransferAsyncError =
  | TransferPlanningError
  | { code: 'daily_limit_exceeded'; remainingCents: number };

const request = {
  fromAccountId: 'checking',
  toAccountId: 'savings',
  amountCents: 2_500,
};

async function ensureWithinDailyLimit(
  accountId: string,
  amountCents: number,
): Promise<Failable<void, TransferAsyncError>> {
  const remainingCents = accountId === 'checking' ? 3_000 : 0;
  if (amountCents > remainingCents) {
    return failure({ code: 'daily_limit_exceeded', remainingCents });
  }

  return success(undefined);
}

const result = await run(async function* ({ get }) {
  const source = yield* get(readSourceAccount(request.fromAccountId));
  const destination = yield* get(readDestinationAccount(request.toAccountId));
  yield* get(ensureDifferentAccounts(source, destination));
  yield* get(ensureSufficientFunds(source, request.amountCents));
  yield* get(ensureWithinDailyLimit(source.id, request.amountCents));

  return success({ ...request, feeCents: 25 });
});
```

Keep these rules in mind:

- `run(...)` composes existing `Failable` values
- if a yielded step fails, `run(...)` returns that original failure unchanged
- in async builders, keep using `yield* get(...)`; do not write `await get(...)`
- `run(...)` does not capture thrown values or rejected promises into `Failure`
- wrap throwing or rejecting boundaries with `createFailable(...)` before they
  enter `run(...)`

## Transport And Runtime Validation

`Failable` values are hydrated objects with methods. Keep them inside your
process. If you need a structured-clone-friendly shape, convert to
`FailableLike<T, E>` before crossing the boundary and rehydrate on the other
side:

```ts
import {
  createFailable,
  toFailableLike,
} from '@pvorona/failable';

const result = planTransfer(
  {
    fromAccountId: 'checking',
    toAccountId: 'savings',
    amountCents: 2_500,
  },
  5_000,
);

const wire = toFailableLike(result);
const hydrated = createFailable(wire);
```

Use the runtime guards only when the input did not come from your own local
control flow:

```ts
import { isFailable } from '@pvorona/failable';

const candidate: unknown = maybeFromAnotherModule();

if (isFailable(candidate) && candidate.isError) {
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
- `success(data)` / `failure(error)`: create hydrated results
- `throwIfError(result)` / `result.getOrThrow()`: throw the stored failure
  unchanged
- `createFailable(...)`: preserve, rehydrate, capture, or normalize failures at
  a boundary
- `run(...)`: compose `Failable` steps without nested branching
- `toFailableLike(...)`: convert a hydrated result into a wire shape
- `isFailableLike(...)`: validate a wire shape
- `isFailable(...)`, `isSuccess(...)`, `isFailure(...)`: validate hydrated
  results
- `NormalizedErrors`: built-in `Error` normalization for `createFailable(...)`
- `FailableStatus`: runtime success/failure status values
