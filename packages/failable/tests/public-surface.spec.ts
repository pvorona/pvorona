import { readFile } from 'node:fs/promises';
import {
  createFailable,
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
  'createFailable',
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

async function divideAsync(
  a: number,
  b: number
): Promise<Failable<number, string>> {
  return divide(a, b);
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
    const okResult = divide(10, 2);
    const errorResult = divide(10, 0);

    if (okResult.isError) {
      throw new Error('Expected divide(10, 2) to succeed');
    }

    expect(okResult.data).toBe(5);

    if (!errorResult.isError) {
      throw new Error('Expected divide(10, 0) to fail');
    }

    expect(errorResult.error).toBe('Cannot divide by zero');
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

  it('supports the README `createFailable(...)` boundary example', () => {
    const result = createFailable(() => JSON.parse('not valid json'));

    if (!result.isError) {
      throw new Error('Expected createFailable(...) to capture the thrown error');
    }

    expect(result.error).toBeInstanceOf(SyntaxError);
  });

  it('supports `NormalizedErrors` for plain-object throws without `[object Object]` messages', () => {
    const rawError = { code: 'bad_request' } as const;
    const result = createFailable(
      () => {
        throw rawError;
      },
      NormalizedErrors
    );

    if (!result.isError) {
      throw new Error('Expected `NormalizedErrors` to capture the thrown plain object');
    }

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).not.toBe('[object Object]');
    expect(result.error).toMatchObject({ cause: rawError });
  });

  it('supports `NormalizedErrors` for null-prototype plain-object throws without escaping', () => {
    const rawError = createNullPrototypeObject({ code: 'bad_request' as const });
    const result = createFailable(
      () => {
        throw rawError;
      },
      NormalizedErrors
    );

    if (!result.isError) {
      throw new Error(
        'Expected `NormalizedErrors` to keep the null-prototype object inside Failure'
      );
    }

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe(JSON.stringify({ code: 'bad_request' }));
    expect(result.error).toMatchObject({ cause: rawError });
  });

  it('supports the README `createFailable(...)` chooser: callback for sync throws, promise for async capture', async () => {
    const syncResult = createFailable(() => JSON.parse('not valid json'));
    const asyncResult = await createFailable(Promise.resolve(5));

    if (!syncResult.isError) {
      throw new Error('Expected the sync callback example to capture a thrown error');
    }

    if (asyncResult.isError) {
      throw new Error('Expected the direct promise example to capture async success');
    }

    expect(syncResult.error).toBeInstanceOf(SyntaxError);
    expect(asyncResult.data).toBe(5);
  });

  it('keeps promise-returning callback misuse inside Failure with an actionable message', () => {
    const result = createFailable(
      (() => Promise.resolve(5)) as unknown as () => number
    );

    if (!result.isError) {
      throw new Error(
        'Expected promise-returning callback misuse to stay in the Failure channel'
      );
    }

    expect(result.error).toBeInstanceOf(Error);
    const error = result.error as Error;
    expect(error.message).toBe(
      '`createFailable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await createFailable(promise)`.'
    );
  });

  it('preserves the actionable guard error even when custom normalization is enabled', () => {
    const normalizeError = vi.fn(
      (error: unknown) => new Error('normalized', { cause: error })
    );
    const result = createFailable(
      (() => Promise.resolve(5)) as unknown as () => number,
      { normalizeError }
    );

    if (!result.isError) {
      throw new Error(
        'Expected promise-returning callback misuse to stay in the Failure channel'
      );
    }

    expect(normalizeError).not.toHaveBeenCalled();
    expect(result.error.message).toBe(
      '`createFailable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await createFailable(promise)`.'
    );
  });

  it('supports the README `run(...)` example', () => {
    const result = run(function* ({ get }) {
      const first = yield* get(divide(20, 2));
      const second = yield* get(divide(first, 5));

      return success(second);
    });

    if (result.isError) {
      throw new Error('Expected the README `run(...)` example to succeed');
    }

    expect(result.data).toBe(2);
  });

  it('supports async `run(...)` composition with promised sources', async () => {
    const result = await run(async function* ({ get }) {
      const first = yield* get(divide(20, 2));
      const second = yield* get(divideAsync(first, 5));

      return success(second);
    });

    if (result.isError) {
      throw new Error('Expected the async `run(...)` example to succeed');
    }

    expect(result.data).toBe(2);
  });

  it('returns the original Failure after draining reachable cleanup during failure unwinding', () => {
    const original = failure('cleanup-failure' as const);
    const cleanupSteps: string[] = [];

    const result = run(function* ({ get }) {
      try {
        yield* get(original);

        return success('unreachable' as const);
      } finally {
        yield* get(success('cleanup-step-1' as const));
        cleanupSteps.push('cleanup-step-1');
        yield* get(success('cleanup-step-2' as const));
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
      run(async function* ({ get }) {
        try {
          yield* get(Promise.resolve(original));

          return success('unreachable' as const);
        } finally {
          yield* get(rejectFailable(rejection));
          reachedLaterCleanup = true;
        }
      })
    ).rejects.toBe(rejection);
    expect(reachedLaterCleanup).toBe(false);
  });

  it('preserves the original Failure when managed cleanup yields Failure', async () => {
    const original = failure('original-failure' as const);
    let outerCleanupRan = false;

    const result = await run(async function* ({ get }) {
      try {
        try {
          yield* get(Promise.resolve(original));

          return success('unreachable' as const);
        } finally {
          yield* get(failure('cleanup-failure' as const));
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
      run(function* ({ get }) {
        try {
          yield* get(original);

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
      run(async function* ({ get }) {
        try {
          yield* get(Promise.resolve(original));

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
      run(async function* ({ get }) {
        try {
          yield* get(rejectFailable(rejection));

          return success('unreachable' as const);
        } finally {
          yield* get(Promise.resolve(success('cleanup-step' as const)));
          managedCleanupRan = true;
        }
      })
    ).rejects.toBe(rejection);
    expect(managedCleanupRan).toBe(true);

    const cleanupThrow = new Error('cleanup-rejection-throw');

    await expect(
      run(async function* ({ get }) {
        try {
          yield* get(rejectFailable(rejection));

          return success('unreachable' as const);
        } finally {
          throwDirectly(cleanupThrow);
        }
      })
    ).rejects.toBe(cleanupThrow);
  });

  it('preserves main-path rejections when managed cleanup yields Failure', async () => {
    const rejection = { code: 'main-rejection' } as const;
    let outerCleanupRan = false;

    await expect(
      run(async function* ({ get }) {
        try {
          try {
            yield* get(rejectFailable(rejection));

            return success('unreachable' as const);
          } finally {
            yield* get(failure('cleanup-failure' as const));
          }
        } finally {
          outerCleanupRan = true;
        }
      })
    ).rejects.toBe(rejection);
    expect(outerCleanupRan).toBe(true);
  });

  it('preserves main-path rejections when managed cleanup promise rejections also happen', async () => {
    const rejection = { code: 'main-rejection' } as const;
    const cleanupRejection = { code: 'cleanup-rejection' } as const;
    let outerCleanupRan = false;

    await expect(
      run(async function* ({ get }) {
        try {
          try {
            yield* get(rejectFailable(rejection));

            return success('unreachable' as const);
          } finally {
            yield* get(rejectFailable(cleanupRejection));
          }
        } finally {
          outerCleanupRan = true;
        }
      })
    ).rejects.toBe(rejection);
    expect(outerCleanupRan).toBe(true);
  });

  it('supports the README structured-clone transport example', () => {
    const wire = toFailableLike(success(123));

    expect(wire).toStrictEqual({
      status: FailableStatus.Success,
      data: 123,
    });
    expect(isFailableLike(wire)).toBe(true);

    const hydrated = createFailable(wire);

    if (hydrated.isError) {
      throw new Error('Expected structured-clone rehydration to succeed');
    }

    expect(hydrated.data).toBe(123);
  });
});
