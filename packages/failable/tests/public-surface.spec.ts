import { readFile } from 'node:fs/promises';
import {
  failable,
  failure,
  FailableStatus,
  isFailure,
  isFailableLike,
  NormalizedErrors,
  run,
  success,
  throwIfError,
  toFailableLike,
  type Failable,
} from '@pvorona/failable';

const EXPECTED_RUNTIME_EXPORTS = [
  'FailableStatus',
  'NormalizedErrors',
  'failable',
  'failure',
  'isFailable',
  'isFailableLike',
  'isFailure',
  'isSuccess',
  'run',
  'success',
  'throwIfError',
  'toFailableLike',
] as const;

const EXPECTED_PACKAGE_EXPORTS = {
  './package.json': './package.json',
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
    default: './dist/index.js',
  },
} as const;

function divide(a: number, b: number): Failable<number, string> {
  if (b === 0) return failure('Cannot divide by zero');

  return success(a / b);
}

type TransferRequest = {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountCents: number;
};

type TransferPlan = TransferRequest & {
  readonly feeCents: number;
};

type TransferError =
  | { readonly code: 'same_account' }
  | { readonly code: 'amount_too_small'; readonly minAmountCents: number }
  | {
      readonly code: 'insufficient_funds';
      readonly balanceCents: number;
      readonly attemptedCents: number;
    };

function planTransfer(
  request: TransferRequest,
  balanceCents: number
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

type SubmitTransferError = Error;

async function postToLedger(
  plan: TransferPlan
): Promise<Failable<{ readonly transferId: string }, SubmitTransferError>> {
  const request = (async () => {
    if (plan.amountCents > 5000) {
      throw { code: 'ledger_unavailable' } as const;
    }

    return { transferId: 'tr_123' } as const;
  })();

  return await failable(request, {
    normalizeError(error) {
      return new Error('Ledger unavailable', { cause: error });
    },
  });
}

async function submitTransfer(
  plan: TransferPlan
): Promise<Failable<{ readonly transferId: string }, SubmitTransferError>> {
  return await run(async function* () {
    const created = yield* await postToLedger(plan);

    return success(created);
  });
}

type Account = {
  readonly id: string;
  readonly balanceCents: number;
};

type TransferPlanningError =
  | TransferError
  | { readonly code: 'source_account_not_found'; readonly accountId: string }
  | { readonly code: 'destination_account_not_found'; readonly accountId: string };

function readSourceAccount(
  accountId: string
): Failable<Account, TransferPlanningError> {
  if (accountId !== 'checking') {
    return failure({ code: 'source_account_not_found', accountId });
  }

  return success({ id: 'checking', balanceCents: 5000 });
}

function readDestinationAccount(
  accountId: string
): Failable<Account, TransferPlanningError> {
  if (accountId !== 'savings') {
    return failure({ code: 'destination_account_not_found', accountId });
  }

  return success({ id: 'savings', balanceCents: 20000 });
}

function ensureDifferentAccounts(
  source: Account,
  destination: Account
): Failable<void, TransferPlanningError> {
  if (source.id === destination.id) return failure({ code: 'same_account' });

  return success();
}

function ensureSufficientFunds(
  source: Account,
  amountCents: number
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

function planTransferWithRun(
  request: TransferRequest
): Failable<TransferPlan, TransferPlanningError> {
  return run(function* () {
    const source = yield* readSourceAccount(request.fromAccountId);
    const destination = yield* readDestinationAccount(request.toAccountId);
    yield* ensureDifferentAccounts(source, destination);
    yield* ensureSufficientFunds(source, request.amountCents);

    return success({ ...request, feeCents: 25 });
  });
}

type TransferAsyncError =
  | TransferPlanningError
  | { readonly code: 'daily_limit_exceeded'; readonly remainingCents: number };

async function ensureWithinDailyLimit(
  accountId: string,
  amountCents: number
): Promise<Failable<void, TransferAsyncError>> {
  const remainingCents = accountId === 'checking' ? 3000 : 0;
  if (amountCents > remainingCents) {
    return failure({ code: 'daily_limit_exceeded', remainingCents });
  }

  return success();
}

async function planTransferWithRunAsync(request: {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountCents: number;
}): Promise<
  Failable<
    TransferPlan,
    TransferAsyncError
  >
> {
  return await run(async function* () {
    const source = yield* readSourceAccount(request.fromAccountId);
    const destination = yield* readDestinationAccount(request.toAccountId);
    yield* ensureDifferentAccounts(source, destination);
    yield* ensureSufficientFunds(source, request.amountCents);
    yield* await ensureWithinDailyLimit(source.id, request.amountCents);

    return success({ ...request, feeCents: 25 });
  });
}

async function rejectFailable(
  rejection: unknown
): Promise<Failable<never, never>> {
  throw rejection;
}

function createNullPrototypeObject<T extends Record<string, unknown>>(
  value: T
): T {
  return Object.assign(
    Object.create(null) as Record<string, unknown>,
    value
  ) as T;
}

function throwDirectly(error: unknown): never {
  throw error;
}

describe('public surface', () => {
  it('pins the exact runtime export set', async () => {
    const packageApi = await import('@pvorona/failable');

    expect(Object.keys(packageApi).sort()).toStrictEqual(
      [...EXPECTED_RUNTIME_EXPORTS].sort()
    );
  });

  it('pins the exact package.json exports object', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8')
    ) as { readonly exports: unknown };

    expect(packageJson.exports).toStrictEqual(EXPECTED_PACKAGE_EXPORTS);
  });

  it('supports the README quick-start branching example', () => {
    const okResult = planTransfer(
      {
        fromAccountId: 'checking',
        toAccountId: 'savings',
        amountCents: 2500,
      },
      5000
    );
    const sameAccountResult = planTransfer(
      {
        fromAccountId: 'checking',
        toAccountId: 'checking',
        amountCents: 2500,
      },
      5000
    );
    const smallAmountResult = planTransfer(
      {
        fromAccountId: 'checking',
        toAccountId: 'savings',
        amountCents: 50,
      },
      5000
    );
    const insufficientFundsResult = planTransfer(
      {
        fromAccountId: 'checking',
        toAccountId: 'savings',
        amountCents: 10000,
      },
      4500
    );

    if (okResult.isFailure) {
      throw new Error('Expected planTransfer(...) to succeed');
    }

    expect(okResult.data).toStrictEqual({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 2500,
      feeCents: 25,
    });

    if (!sameAccountResult.isFailure) {
      throw new Error('Expected same-account transfer to fail');
    }

    expect(sameAccountResult.error).toStrictEqual({ code: 'same_account' });

    if (!smallAmountResult.isFailure) {
      throw new Error('Expected small transfer to fail');
    }

    expect(smallAmountResult.error).toStrictEqual({
      code: 'amount_too_small',
      minAmountCents: 100,
    });

    if (!insufficientFundsResult.isFailure) {
      throw new Error('Expected insufficient funds to fail');
    }

    expect(insufficientFundsResult.error).toStrictEqual({
      code: 'insufficient_funds',
      balanceCents: 4500,
      attemptedCents: 10000,
    });
  });

  it('supports guard-based validation for hydrated unknown values', () => {
    const candidate: unknown = divide(10, 0);

    if (!isFailure(candidate)) {
      throw new Error('Expected the unknown candidate to be a hydrated failure');
    }

    expect(candidate.error).toBe('Cannot divide by zero');
  });

  it('supports the README `throwIfError(...)` example', () => {
    const result = divide(10, 2);

    throwIfError(result);

    expect(result.data).toBe(5);
  });

  it('throws the stored failure unchanged with `throwIfError(...)`', () => {
    const result = divide(10, 0);

    try {
      throwIfError(result);
    } catch (error) {
      expect(error).toBe('Cannot divide by zero');
      return;
    }

    throw new Error('Expected throwIfError(...) to throw the stored error');
  });

  it('supports the README `getOrThrow()` example', () => {
    const result = divide(10, 2);

    const value = result.getOrThrow();

    expect(value).toBe(5);
  });

  it('throws the stored failure unchanged with `getOrThrow()`', () => {
    const result = divide(10, 0);

    try {
      result.getOrThrow();
    } catch (error) {
      expect(error).toBe('Cannot divide by zero');
      return;
    }

    throw new Error('Expected getOrThrow() to throw the stored error');
  });

  it('throws a descriptive Error for `failure().getOrThrow()`', () => {
    expect(() => failure().getOrThrow()).toThrow(
      'getOrThrow() called on Failure<void> with no error value'
    );
  });

  it('supports the README `failable(...)` boundary example', async () => {
    const okResult = await submitTransfer({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 2500,
      feeCents: 25,
    });
    const ledgerFailureResult = await submitTransfer({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 6000,
      feeCents: 25,
    });

    if (okResult.isFailure) {
      throw new Error('Expected submitTransfer(...) to succeed');
    }

    expect(okResult.data).toStrictEqual({ transferId: 'tr_123' });

    if (!ledgerFailureResult.isFailure) {
      throw new Error('Expected submitTransfer(...) to capture ledger failure');
    }

    expect(ledgerFailureResult.error).toBeInstanceOf(Error);
    expect(ledgerFailureResult.error).toMatchObject({
      message: 'Ledger unavailable',
      cause: { code: 'ledger_unavailable' },
    });
  });

  it('supports `NormalizedErrors` for plain-object throws without `[object Object]` messages', () => {
    const rawError = { code: 'bad_request' } as const;
    const result = failable(
      () => {
        throw rawError;
      },
      NormalizedErrors
    );

    if (!result.isFailure) {
      throw new Error('Expected `NormalizedErrors` to capture the thrown plain object');
    }

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).not.toBe('[object Object]');
    expect(result.error).toMatchObject({ cause: rawError });
  });

  it('supports `NormalizedErrors` for null-prototype plain-object throws without escaping', () => {
    const rawError = createNullPrototypeObject({ code: 'bad_request' as const });
    const result = failable(
      () => {
        throw rawError;
      },
      NormalizedErrors
    );

    if (!result.isFailure) {
      throw new Error(
        'Expected `NormalizedErrors` to keep the null-prototype object inside Failure'
      );
    }

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(JSON.stringify({ code: 'bad_request' }));
    expect(result.error).toMatchObject({ cause: rawError });
  });

  it('supports the README `failable(...)` chooser: callback for sync throws, promise for async capture', async () => {
    const syncResult = failable(() => JSON.parse('not valid json'));
    const asyncResult = await failable(Promise.resolve(5));

    if (!syncResult.isFailure) {
      throw new Error('Expected the sync callback example to capture a thrown error');
    }

    if (asyncResult.isFailure) {
      throw new Error('Expected the direct promise example to capture async success');
    }

    expect(syncResult.error).toBeInstanceOf(SyntaxError);
    expect(asyncResult.data).toBe(5);
  });

  it('exposes the exact sync-callback misuse guidance for `failable(() => promise)`', () => {
    const result = failable(
      (() => Promise.resolve(5)) as unknown as () => number
    );

    if (!result.isFailure) {
      throw new Error('Expected `failable(() => promise)` to return a Failure');
    }

    if (!(result.error instanceof Error)) {
      throw new Error('Expected `failable(() => promise)` to capture an Error');
    }

    expect(result.error.message).toBe(
      '`failable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await failable(promise)`.'
    );
  });

  it('supports the README `run(...)` example', () => {
    const result = planTransferWithRun({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 2500,
    });

    if (result.isFailure) {
      throw new Error('Expected the README `run(...)` example to succeed');
    }

    expect(result.data).toStrictEqual({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 2500,
      feeCents: 25,
    });
  });

  it('supports async `run(...)` composition with promised sources', async () => {
    const result = await planTransferWithRunAsync({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 2500,
    });

    if (result.isFailure) {
      throw new Error('Expected the async `run(...)` example to succeed');
    }

    expect(result.data).toStrictEqual({
      fromAccountId: 'checking',
      toAccountId: 'savings',
      amountCents: 2500,
      feeCents: 25,
    });
  });

  it('exposes iterable and async-iterable hydrated results for direct `yield*` use', () => {
    const ok = success(123 as const);
    const problem = failure('boom' as const);

    expect(typeof ok[Symbol.iterator]).toBe('function');
    expect(typeof ok[Symbol.asyncIterator]).toBe('function');
    expect(typeof problem[Symbol.iterator]).toBe('function');
    expect(typeof problem[Symbol.asyncIterator]).toBe('function');
  });

  it('returns the original Failure after draining reachable cleanup during failure unwinding', () => {
    const original = failure('cleanup-failure' as const);
    const cleanupSteps: string[] = [];

    const result = run(function* () {
      try {
        yield* original;

        return success('unreachable' as const);
      } finally {
        yield* success('cleanup-step-1' as const);
        cleanupSteps.push('cleanup-step-1');
        yield* success('cleanup-step-2' as const);
        cleanupSteps.push('cleanup-step-2');
      }
    });

    expect(result).toBe(original);
    expect(cleanupSteps).toStrictEqual(['cleanup-step-1', 'cleanup-step-2']);
  });

  it('rejects promised cleanup rejections unchanged during failure unwinding', async () => {
    const original = failure('cleanup-base-failure' as const);
    const rejection = { code: 'cleanup-rejection' } as const;
    let reachedLaterCleanup = false;

    await expect(
      run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable' as const);
        } finally {
          yield* await rejectFailable(rejection);
          reachedLaterCleanup = true;
        }
      })
    ).rejects.toBe(rejection);
    expect(reachedLaterCleanup).toBe(false);
  });

  it('preserves the original Failure when managed cleanup yields Failure', async () => {
    const original = failure('original-failure' as const);
    let outerCleanupRan = false;

    const result = await run(async function* () {
      try {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable' as const);
        } finally {
          yield* failure('cleanup-failure' as const);
        }
      } finally {
        outerCleanupRan = true;
      }
    });

    expect(result).toBe(original);
    expect(outerCleanupRan).toBe(true);
  });

  it('lets direct cleanup throws replace yielded Failures', () => {
    const original = failure('original-failure' as const);
    const cleanupThrow = new Error('cleanup-throw');

    expect(() =>
      run(function* () {
        try {
          yield* original;

          return success('unreachable' as const);
        } finally {
          throwDirectly(cleanupThrow);
        }
      })
    ).toThrow(cleanupThrow);
  });

  it('lets async direct cleanup throws replace yielded Failures', async () => {
    const original = failure('original-failure' as const);
    const cleanupThrow = new Error('async-cleanup-throw');

    await expect(
      run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable' as const);
        } finally {
          throwDirectly(cleanupThrow);
        }
      })
    ).rejects.toBe(cleanupThrow);
  });

  it('preserves main-path rejections after managed cleanup, but direct throws still replace them', async () => {
    const rejection = { code: 'main-rejection' } as const;
    let managedCleanupRan = false;

    await expect(
      run(async function* () {
        try {
          yield* await rejectFailable(rejection);

          return success('unreachable' as const);
        } finally {
          yield* await Promise.resolve(success('cleanup-step' as const));
          managedCleanupRan = true;
        }
      })
    ).rejects.toBe(rejection);
    expect(managedCleanupRan).toBe(true);

    const cleanupThrow = new Error('cleanup-rejection-throw');

    await expect(
      run(async function* () {
        try {
          yield* await rejectFailable(rejection);

          return success('unreachable' as const);
        } finally {
          throwDirectly(cleanupThrow);
        }
      })
    ).rejects.toBe(cleanupThrow);
  });

  it('returns the cleanup Failure when managed cleanup yields Failure', async () => {
    const rejection = { code: 'main-rejection' } as const;
    const cleanupFailure = failure('cleanup-failure' as const);
    let outerCleanupRan = false;

    await expect(
      run(async function* () {
        try {
          try {
            yield* await rejectFailable(rejection);

            return success('unreachable' as const);
          } finally {
            yield* cleanupFailure;
          }
        } finally {
          outerCleanupRan = true;
        }
      })
    ).resolves.toBe(cleanupFailure);
    expect(outerCleanupRan).toBe(true);
  });

  it('uses the cleanup rejection when managed cleanup promise rejections also happen', async () => {
    const rejection = { code: 'main-rejection' } as const;
    const cleanupRejection = { code: 'cleanup-rejection' } as const;
    let outerCleanupRan = false;

    await expect(
      run(async function* () {
        try {
          try {
            yield* await rejectFailable(rejection);

            return success('unreachable' as const);
          } finally {
            yield* await rejectFailable(cleanupRejection);
          }
        } finally {
          outerCleanupRan = true;
        }
      })
    ).rejects.toBe(cleanupRejection);
    expect(outerCleanupRan).toBe(true);
  });

  it('supports the README structured-clone transport example', () => {
    const wire = toFailableLike(success(123));

    expect(wire).toStrictEqual({
      status: FailableStatus.Success,
      data: 123,
    });
    expect(isFailableLike(wire)).toBe(true);

    const hydrated = failable(wire);

    if (hydrated.isFailure) {
      throw new Error('Expected structured-clone rehydration to succeed');
    }

    expect(hydrated.data).toBe(123);
  });
});
