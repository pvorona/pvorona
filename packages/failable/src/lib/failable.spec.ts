import { faker } from '@faker-js/faker';
import { expectTypeOf } from 'expect-type';
import {
  all,
  allSettled,
  failable,
  failure,
  FailableStatus,
  isFailable,
  isFailableLike,
  isFailure,
  isSuccess,
  NormalizedErrors,
  race,
  run,
  success,
  throwIfFailure,
  toFailableLike,
  type Failable,
  type FailableLike,
  type FailableLikeFailure,
  type FailableLikeSuccess,
  type Failure,
  type Success,
} from './failable.js';

const RAW_ERROR_CASES = [
  { label: 'string', error: faker.string.uuid() },
  { label: 'number', error: faker.number.int() },
  {
    label: 'plain object',
    error: {
      code: faker.string.uuid(),
      retryable: faker.datatype.boolean(),
    },
  },
  {
    label: 'array',
    error: [faker.string.uuid(), faker.number.int()],
  },
] as const;

function ensureFailure(result: unknown): asserts result is Failure<unknown> {
  if (isFailure(result)) return;

  throw new Error('Expected Failure result');
}

function ensureSuccess(result: unknown): asserts result is Success<unknown> {
  if (isSuccess(result)) return;

  throw new Error('Expected Success result');
}

function createSuccessLookalike<T>(data: T): unknown {
  return {
    status: FailableStatus.Success,
    isSuccess: true as const,
    isFailure: false as const,
    data,
    error: null,
    or: vi.fn(),
    orElse: vi.fn(),
    getOr: vi.fn(),
    getOrElse: vi.fn(),
    getOrThrow: vi.fn(),
    match: vi.fn(),
  };
}

function createFailureLookalike<E>(error: E): unknown {
  return {
    status: FailableStatus.Failure,
    isSuccess: false as const,
    isFailure: true as const,
    data: null,
    error,
    or: vi.fn(),
    orElse: vi.fn(),
    getOr: vi.fn(),
    getOrElse: vi.fn(),
    getOrThrow: vi.fn(),
    match: vi.fn(),
  };
}

function createRunReturnSuccessLike<T>(data: T) {
  return {
    status: FailableStatus.Success,
    data,
    error: null,
    match: ((onSuccess: (value: T) => T) => onSuccess(data)) as Success<T>['match'],
  };
}

function createRunReturnFailureLike<E>(error: E) {
  return {
    status: FailableStatus.Failure,
    data: null,
    error,
    match: ((_: (value: never) => E, onFailure: (value: E) => E) =>
      onFailure(error)) as Failure<E>['match'],
  };
}

function createUnionFailable<T, E>(data: T, error: E): Failable<T, E> {
  return faker.helpers.arrayElement([
    success(data),
    failure(error),
  ]) as Failable<T, E>;
}

function createResolvingThenable<T>(value: T): PromiseLike<T> {
  return {
    then<TResult1 = T, TResult2 = never>(
      onFulfilled?:
        | ((resolvedValue: T) => TResult1 | PromiseLike<TResult1>)
        | null
        | undefined,
      onRejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null
        | undefined
    ) {
      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
  };
}

function createRejectingThenable<T>(error: unknown): PromiseLike<T> {
  return {
    then<TResult1 = T, TResult2 = never>(
      _onFulfilled?:
        | ((value: T) => TResult1 | PromiseLike<TResult1>)
        | null
        | undefined,
      onRejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null
        | undefined
    ) {
      return Promise.reject(error).then(_onFulfilled, onRejected);
    },
  };
}

function createNullPrototypeObject<T extends Record<string, unknown>>(
  value: T
): T {
  return Object.assign(
    Object.create(null) as Record<string, unknown>,
    value
  ) as T;
}

function createUnstringifiableErrorValue(): {
  readonly toString: () => never;
  readonly [Symbol.toPrimitive]?: () => never;
} {
  return Object.assign(Object.create({ marker: true }) as object, {
    toString() {
      throw 'coercion boom';
    },
  }) as {
    readonly toString: () => never;
    readonly [Symbol.toPrimitive]?: () => never;
  };
}

function createPlainObjectWithoutSafeErrorMessage(): Record<string | symbol, unknown> {
  const value = createNullPrototypeObject({}) as Record<string | symbol, unknown>;

  Object.defineProperty(value, 'toJSON', {
    value() {
      throw 'json boom';
    },
    enumerable: true,
  });

  Object.defineProperty(value, Symbol.toStringTag, {
    get() {
      throw 'tag boom';
    },
  });

  return value;
}

function expectThrowBoundaryToNormalizeFailure(
  runThrowBoundary: () => unknown,
  rawError: unknown
): void {
  const normalized = failable(failure(rawError), NormalizedErrors);
  ensureFailure(normalized);

  try {
    runThrowBoundary();
  } catch (thrown) {
    expect(thrown).toBeInstanceOf(Error);

    if (rawError instanceof Error) {
      expect(thrown).toBe(rawError);
      return;
    }

    const actual = thrown as Error & { cause?: unknown };
    expect(actual.message).toBe(normalized.error.message);
    expect(actual.cause).toBe(normalized.error.cause);
    expect(thrown).not.toBe(rawError);

    if (normalized.error instanceof AggregateError) {
      expect(thrown).toBeInstanceOf(AggregateError);
    }

    return;
  }

  throw new Error('Expected throw boundary to throw');
}

function throwDirectly(error: unknown): never {
  throw error;
}

describe('success()', () => {
  const value = 123;
  const result = success(value);

  it('is frozen', () => {
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('status = FailableStatus.Success', () => {
    expect(result.status).toBe(FailableStatus.Success);
  });

  it('isSuccess = true', () => {
    expect(result.isSuccess).toBe(true);
  });

  it('isFailure = false', () => {
    expect(result.isFailure).toBe(false);
  });

  it('data = T', () => {
    expect(result.data).toBe(value);
  });

  it('error = null', () => {
    expect(result.error).toBeNull();
  });

  it('supports omitting the undefined argument for void results', () => {
    function buildResult(): Failable<void, string> {
      return success();
    }

    const result = buildResult();

    expect(result.data).toBeUndefined();
    expect(result).toStrictEqual(success(undefined));
    expectTypeOf(result).toEqualTypeOf<Failable<void, string>>();
  });
});

describe('failure()', () => {
  const error = new Error('boom');
  const result = failure(error);

  it('is frozen', () => {
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('status = FailableStatus.Failure', () => {
    expect(result.status).toBe(FailableStatus.Failure);
  });

  it('isSuccess = false', () => {
    expect(result.isSuccess).toBe(false);
  });

  it('isFailure = true', () => {
    expect(result.isFailure).toBe(true);
  });

  it('error = E', () => {
    expect(result.error).toBe(error);
  });

  it('data = null', () => {
    expect(result.data).toBeNull();
  });

  it('supports omitting the undefined argument for void failures', () => {
    function buildResult(): Failable<string, void> {
      return failure();
    }

    const result = buildResult();

    expect(result.error).toBeUndefined();
    expect(result).toStrictEqual(failure(undefined));
    expectTypeOf(result).toEqualTypeOf<Failable<string, void>>();
  });
});

describe('isFailable()', () => {
  describe('Success input', () => {
    it('returns true', () => {
      expect(isFailable(success(faker.number.float()))).toBe(true);
    });
  });

  describe('Failure input', () => {
    it('returns true', () => {
      expect(isFailable(failure(new Error(faker.string.uuid())))).toBe(true);
    });
  });

  describe('plain Success lookalike input', () => {
    it('returns false', () => {
      expect(isFailable(createSuccessLookalike(faker.number.float()))).toBe(
        false
      );
    });
  });

  describe('plain Failure lookalike input', () => {
    it('returns false', () => {
      expect(
        isFailable(createFailureLookalike(new Error(faker.string.uuid())))
      ).toBe(false);
    });
  });
});

describe('isSuccess()', () => {
  describe('Success input', () => {
    it('returns true', () => {
      expect(isSuccess(success(faker.number.float()))).toBe(true);
    });
  });

  describe('Failure input', () => {
    it('returns false', () => {
      expect(isSuccess(failure(new Error(faker.string.uuid())))).toBe(false);
    });
  });

  describe('plain Success lookalike input', () => {
    it('returns false', () => {
      expect(isSuccess(createSuccessLookalike(faker.number.float()))).toBe(
        false
      );
    });
  });

  describe('plain Failure lookalike input', () => {
    it('returns false', () => {
      expect(
        isSuccess(createFailureLookalike(new Error(faker.string.uuid())))
      ).toBe(false);
    });
  });
});

describe('isFailure()', () => {
  describe('Success input', () => {
    it('returns false', () => {
      expect(isFailure(success(faker.number.float()))).toBe(false);
    });
  });

  describe('Failure input', () => {
    it('returns true', () => {
      expect(isFailure(failure(new Error(faker.string.uuid())))).toBe(true);
    });
  });

  describe('plain Success lookalike input', () => {
    it('returns false', () => {
      expect(isFailure(createSuccessLookalike(faker.number.float()))).toBe(
        false
      );
    });
  });

  describe('plain Failure lookalike input', () => {
    it('returns false', () => {
      expect(
        isFailure(createFailureLookalike(new Error(faker.string.uuid())))
      ).toBe(false);
    });
  });
});

describe('toFailableLike()', () => {
  describe('Success input', () => {
    it('returns { status, data }', () => {
      const value = faker.number.float();

      expect(toFailableLike(success(value))).toStrictEqual({
        status: FailableStatus.Success,
        data: value,
      });
    });

    it('returns FailableLikeSuccess', () => {
      const value = 123;
      const result = toFailableLike(success(value));

      expectTypeOf(result).toEqualTypeOf<FailableLikeSuccess<typeof value>>();
    });
  });

  describe('Failure input', () => {
    it('returns { status, error }', () => {
      const error = new Error(faker.string.uuid());

      expect(toFailableLike(failure(error))).toStrictEqual({
        status: FailableStatus.Failure,
        error,
      });
    });

    it('returns FailableLikeFailure', () => {
      const error = faker.string.uuid();
      const result = toFailableLike(failure(error));

      expectTypeOf(result).toEqualTypeOf<FailableLikeFailure<typeof error>>();
    });
  });

  describe('Failable input', () => {
    it('infers FailableLike<T, E>', () => {
      type DataType = 123;
      type ErrorType = 'boom';

      const result = toFailableLike(
        createUnionFailable(123 as DataType, 'boom' as ErrorType)
      );

      expectTypeOf(result).toEqualTypeOf<FailableLike<DataType, ErrorType>>();
    });
  });
});

describe('isFailableLike()', () => {
  describe('Success shape', () => {
    it('returns true', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Success,
          data: faker.number.float(),
        })
      ).toBe(true);
    });

    it('returns true for { status: success, data: undefined }', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Success,
          data: undefined,
        })
      ).toBe(true);
    });
  });

  describe('Failure shape', () => {
    it('returns true', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Failure,
          error: new Error(faker.string.uuid()),
        })
      ).toBe(true);
    });

    it('returns true for { status: failure, error: undefined }', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Failure,
          error: undefined,
        })
      ).toBe(true);
    });
  });

  describe('non-object input', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['boolean', faker.helpers.arrayElement([true, false])],
      ['number', faker.number.float()],
      ['string', faker.string.uuid()],
      ['bigint', BigInt(faker.number.int({ min: 0, max: 10_000 }))],
      ['symbol', Symbol(faker.string.uuid())],
      ['function', () => faker.string.uuid()],
    ])('returns false for %s', (_, value) => {
      expect(isFailableLike(value)).toBe(false);
    });
  });

  describe('array input', () => {
    it('returns false', () => {
      expect(isFailableLike([faker.string.uuid()])).toBe(false);
    });
  });

  describe('invalid shape input', () => {
    it('returns false for plain objects without status', () => {
      expect(isFailableLike({ foo: faker.string.uuid() })).toBe(false);
    });

    it('returns false for objects with an unknown status', () => {
      expect(isFailableLike({ status: 'wat', data: 123 })).toBe(false);
    });

    it('returns false for success shapes without data', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Success,
        })
      ).toBe(false);
    });

    it('returns false for failure shapes without error', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Failure,
        })
      ).toBe(false);
    });
  });

  describe('extra property input', () => {
    it('returns false for success shapes with extra enumerable properties', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Success,
          data: faker.number.float(),
          extra: faker.string.uuid(),
        })
      ).toBe(false);
    });

    it('returns false for failure shapes with extra enumerable properties', () => {
      expect(
        isFailableLike({
          status: FailableStatus.Failure,
          error: faker.string.uuid(),
          extra: faker.string.uuid(),
        })
      ).toBe(false);
    });
  });
});

describe('or()', () => {
  describe('Success receiver', () => {
    it('returns the original Success instance', () => {
      const original = success(faker.number.float());

      expect(original.or(faker.string.uuid())).toBe(original);
    });

    it('preserves the original success type', () => {
      type ValueType = 123;

      const result = success(123 as ValueType).or('fallback');

      expectTypeOf(result).toEqualTypeOf<Success<ValueType>>();
    });
  });

  describe('Failure receiver', () => {
    it('returns the fallback wrapped in Success', () => {
      const fallback = faker.string.uuid();

      expect(
        failure(new Error(faker.string.uuid())).or(fallback)
      ).toStrictEqual(success(fallback));
    });

    it('infers the fallback success type', () => {
      type FallbackType = { readonly recovered: true };

      const fallback = { recovered: true } as const satisfies FallbackType;
      const result = failure('boom').or(fallback);

      expectTypeOf(result).toEqualTypeOf<Success<FallbackType>>();
    });
  });

  describe('Failable receiver', () => {
    it('infers union result type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';
      type FallbackType = 'fallback';

      const result = createUnionFailable(
        123 as ValueType,
        'boom' as ErrorType
      ).or('fallback' as FallbackType);

      expectTypeOf(result).toEqualTypeOf<
        Success<ValueType> | Success<FallbackType>
      >();
    });
  });
});

describe('orElse()', () => {
  describe('Success receiver', () => {
    it('returns the original Success instance', () => {
      const original = success(faker.number.float());

      expect(original.orElse(() => faker.string.uuid())).toBe(original);
    });

    it("doesn't invoke the fallback callback", () => {
      const original = success(faker.number.float());
      const getFallback = vi.fn(() => faker.string.uuid());

      original.orElse(getFallback);

      expect(getFallback).not.toHaveBeenCalled();
    });

    it('preserves the original success type', () => {
      type ValueType = 123;

      const result = success(123 as ValueType).orElse(() => 'fallback');

      expectTypeOf(result).toEqualTypeOf<Success<ValueType>>();
    });
  });

  describe('Failure receiver', () => {
    it('returns the callback result wrapped in Success', () => {
      const fallback = faker.string.uuid();

      expect(
        failure(new Error(faker.string.uuid())).orElse(() => fallback)
      ).toStrictEqual(success(fallback));
    });

    it('invokes the fallback callback once', () => {
      const getFallback = vi.fn(() => faker.string.uuid());

      failure(new Error(faker.string.uuid())).orElse(getFallback);

      expect(getFallback).toHaveBeenCalledTimes(1);
    });

    it('passes the stored error even to zero-arg `orElse(...)` callbacks on Failure', () => {
      const error = new Error(faker.string.uuid());
      const fallback = faker.string.uuid();
      let receivedArgumentCount = -1;
      let receivedError: unknown;

      const result = failure(error).orElse(function legacyFallback(
        ...receivedArguments: readonly unknown[]
      ) {
        receivedArgumentCount = receivedArguments.length;
        [receivedError] = receivedArguments;

        return fallback;
      });

      expect(receivedArgumentCount).toBe(1);
      expect(receivedError).toBe(error);
      expect(result).toStrictEqual(success(fallback));
    });

    it('passes the stored error to `orElse(...)` on Failure', () => {
      const error = { code: 'boom' } as const;
      const getFallback = vi.fn(
        (receivedError: typeof error) => receivedError.code
      );

      const result = failure(error).orElse(getFallback);

      expect(getFallback).toHaveBeenCalledWith(error);
      expect(result).toStrictEqual(success('boom'));
    });

    it('infers the callback success type', () => {
      type FallbackType = { readonly recovered: true };

      const fallback = { recovered: true } as const satisfies FallbackType;
      const result = failure('boom').orElse(() => fallback);

      expectTypeOf(result).toEqualTypeOf<Success<FallbackType>>();
    });
  });

  describe('Failable receiver', () => {
    it('infers union result type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';
      type FallbackType = 'fallback';

      const result = createUnionFailable(
        123 as ValueType,
        'boom' as ErrorType
      ).orElse(() => 'fallback' as FallbackType);

      expectTypeOf(result).toEqualTypeOf<
        Success<ValueType> | Success<FallbackType>
      >();
    });
  });
});

describe('getOr()', () => {
  describe('Success receiver', () => {
    it('returns data', () => {
      const value = 123;

      expect(success(value).getOr('fallback')).toBe(value);
    });

    it('preserves the success data type', () => {
      type ValueType = 123;

      const result = success(123 as ValueType).getOr('fallback');

      expectTypeOf(result).toEqualTypeOf<ValueType>();
    });
  });

  describe('Failure receiver', () => {
    it('returns the fallback value', () => {
      const fallback = 'fallback';

      expect(failure(new Error(faker.string.uuid())).getOr(fallback)).toBe(
        fallback
      );
    });

    it('preserves the fallback type', () => {
      type FallbackType = { readonly recovered: true };

      const fallback = { recovered: true } as const satisfies FallbackType;
      const result = failure('boom').getOr(fallback);

      expectTypeOf(result).toEqualTypeOf<FallbackType>();
    });
  });

  describe('Failable receiver', () => {
    it('infers union return type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';
      type FallbackType = 'fallback';

      const result = createUnionFailable(
        123 as ValueType,
        'boom' as ErrorType
      ).getOr('fallback' as FallbackType);

      expectTypeOf(result).toEqualTypeOf<ValueType | FallbackType>();
    });
  });
});

describe('getOrElse()', () => {
  describe('Success receiver', () => {
    it('returns data', () => {
      const value = 123;

      expect(success(value).getOrElse(() => 'fallback')).toBe(value);
    });

    it("doesn't invoke the fallback callback", () => {
      const getFallback = vi.fn(() => faker.string.uuid());

      success(faker.number.float()).getOrElse(getFallback);

      expect(getFallback).not.toHaveBeenCalled();
    });

    it('preserves the success data type', () => {
      type ValueType = 123;

      const result = success(123 as ValueType).getOrElse(() => 'fallback');

      expectTypeOf(result).toEqualTypeOf<ValueType>();
    });
  });

  describe('Failure receiver', () => {
    it('returns the callback result', () => {
      const fallback = 'fallback';

      expect(
        failure(new Error(faker.string.uuid())).getOrElse(() => fallback)
      ).toBe(fallback);
    });

    it('invokes the fallback callback once', () => {
      const getFallback = vi.fn(() => faker.string.uuid());

      failure(new Error(faker.string.uuid())).getOrElse(getFallback);

      expect(getFallback).toHaveBeenCalledTimes(1);
    });

    it('passes the stored error even to zero-arg `getOrElse(...)` callbacks on Failure', () => {
      const error = new Error(faker.string.uuid());
      const fallback = faker.string.uuid();
      let receivedArgumentCount = -1;
      let receivedError: unknown;

      const result = failure(error).getOrElse(function legacyFallback(
        ...receivedArguments: readonly unknown[]
      ) {
        receivedArgumentCount = receivedArguments.length;
        [receivedError] = receivedArguments;

        return fallback;
      });

      expect(receivedArgumentCount).toBe(1);
      expect(receivedError).toBe(error);
      expect(result).toBe(fallback);
    });

    it('passes the stored error to `getOrElse(...)` on Failure', () => {
      const error = { code: 'boom' } as const;
      const getFallback = vi.fn(
        (receivedError: typeof error) => receivedError.code
      );

      const result = failure(error).getOrElse(getFallback);

      expect(getFallback).toHaveBeenCalledWith(error);
      expect(result).toBe('boom');
    });

    it('preserves the callback return type', () => {
      type FallbackType = { readonly recovered: true };

      const fallback = { recovered: true } as const satisfies FallbackType;
      const result = failure('boom').getOrElse(() => fallback);

      expectTypeOf(result).toEqualTypeOf<FallbackType>();
    });
  });

  describe('Failable receiver', () => {
    it('infers union return type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';
      type FallbackType = 'fallback';

      const result = createUnionFailable(
        123 as ValueType,
        'boom' as ErrorType
      ).getOrElse(() => 'fallback' as FallbackType);

      expectTypeOf(result).toEqualTypeOf<ValueType | FallbackType>();
    });
  });
});

describe('getOrThrow()', () => {
  describe('Success receiver', () => {
    it('returns data', () => {
      const value = 123;

      expect(success(value).getOrThrow()).toBe(value);
    });

    it('returns the success data type', () => {
      type ValueType = 123;

      const result = success(123 as ValueType).getOrThrow();

      expectTypeOf(result).toEqualTypeOf<ValueType>();
    });
  });

  describe('Failure receiver', () => {
    it('preserves existing Error instances', () => {
      const error = new Error(faker.string.uuid());

      expect(() => failure(error).getOrThrow()).toThrow(error);
    });

    it('preserves existing Error instances with NormalizedErrors', () => {
      const error = new Error(faker.string.uuid());

      expect(() => failure(error).getOrThrow(NormalizedErrors)).toThrow(error);
    });

    it.each(RAW_ERROR_CASES)(
      'normalizes non-Error failure values into Error objects ($label)',
      ({ error }) => {
        expectThrowBoundaryToNormalizeFailure(
          () => failure(error).getOrThrow(),
          error
        );
      }
    );

    it.each(RAW_ERROR_CASES)(
      'normalizes non-Error failure values into Error objects with NormalizedErrors ($label)',
      ({ error }) => {
        expectThrowBoundaryToNormalizeFailure(
          () => failure(error).getOrThrow(NormalizedErrors),
          error
        );
      }
    );

    it('normalizes void failures into Error objects', () => {
      expectThrowBoundaryToNormalizeFailure(() => failure().getOrThrow(), undefined);
    });

    it('normalizes void failures into Error objects with NormalizedErrors', () => {
      expectThrowBoundaryToNormalizeFailure(
        () => failure().getOrThrow(NormalizedErrors),
        undefined
      );
    });

    it('does not leak thrown coercion errors while normalizing failures', () => {
      const rawError = createUnstringifiableErrorValue();

      try {
        failure(rawError).getOrThrow();
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Error);
        expect(thrown).not.toBe('coercion boom');
        expect(thrown).toMatchObject({
          message: 'Unstringifiable error value',
          cause: rawError,
        });
        return;
      }

      throw new Error('Expected getOrThrow() to throw');
    });

    it('uses custom normalizeError for non-Error failure values', () => {
      const rawError = { code: faker.string.uuid() } as const;
      const normalized = new Error('normalized', { cause: rawError });
      const normalizeError = vi.fn((error: unknown) => {
        expect(error).toBe(rawError);
        return normalized;
      });

      expect(() =>
        failure(rawError).getOrThrow({ normalizeError })
      ).toThrow(normalized);
      expect(normalizeError).toHaveBeenCalledWith(rawError);
    });

    it('uses custom normalizeError for existing Error failure values', () => {
      const rawError = new Error(faker.string.uuid());
      const normalized = new Error('normalized', { cause: rawError });
      const normalizeError = vi.fn((error: unknown) => {
        expect(error).toBe(rawError);
        return normalized;
      });

      expect(() =>
        failure(rawError).getOrThrow({ normalizeError })
      ).toThrow(normalized);
      expect(normalizeError).toHaveBeenCalledWith(rawError);
    });

    it('returns never for failure types', () => {
      const result = failure('boom');

      expect(isFailure(result)).toBe(true);
      expectTypeOf<
        ReturnType<typeof result.getOrThrow>
      >().toEqualTypeOf<never>();
    });
  });

  describe('Failable receiver', () => {
    it('infers the success data type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';

      const result = createUnionFailable(123 as ValueType, 'boom' as ErrorType);

      expect(isFailable(result)).toBe(true);
      expectTypeOf<
        ReturnType<typeof result.getOrThrow>
      >().toEqualTypeOf<ValueType>();
    });
  });
});

describe('map()', () => {
  describe('Success receiver', () => {
    it('returns Success with transformed data', () => {
      const source = success(123);

      const result = source.map((value) => value.toString());

      expect(result).toStrictEqual(success('123'));
    });

    it('rethrows callback errors unchanged', () => {
      const thrown = new Error('map boom');

      try {
        success(123).map(() => {
          throw thrown;
        });
      } catch (error) {
        expect(error).toBe(thrown);
        return;
      }

      throw new Error('Expected `map()` to rethrow the callback error');
    });
  });

  describe('Failure receiver', () => {
    it('returns the original Failure unchanged', () => {
      const source = failure('boom');

      const result = source.map(() => 123);

      expect(result).toBe(source);
    });
  });
});

describe('flatMap()', () => {
  describe('Success receiver', () => {
    it('returns the callback result unchanged', () => {
      const expected = success('123');

      const result = success(123).flatMap(() => expected);

      expect(result).toBe(expected);
    });

    it('rethrows callback errors unchanged', () => {
      const thrown = new Error('flatMap boom');

      try {
        success(123).flatMap(() => {
          throw thrown;
        });
      } catch (error) {
        expect(error).toBe(thrown);
        return;
      }

      throw new Error('Expected `flatMap()` to rethrow the callback error');
    });
  });

  describe('Failure receiver', () => {
    it('returns the original Failure unchanged', () => {
      const source = failure('boom');

      const result = source.flatMap(() => success(123));

      expect(result).toBe(source);
    });
  });
});

describe('throwIfFailure()', () => {
  it('returns without throwing for success input', () => {
    expect(throwIfFailure(success(123))).toBeUndefined();
  });

  it('preserves existing Error instances for failure input', () => {
    const error = new Error(faker.string.uuid());

    try {
      throwIfFailure(failure(error));
    } catch (thrown) {
      expect(thrown).toBe(error);
      return;
    }

    throw new Error('Expected throwIfFailure() to throw the stored error');
  });

  it('preserves existing Error instances with NormalizedErrors for failure input', () => {
    const error = new Error(faker.string.uuid());

    try {
      throwIfFailure(failure(error), NormalizedErrors);
    } catch (thrown) {
      expect(thrown).toBe(error);
      return;
    }

    throw new Error('Expected throwIfFailure() to throw the stored error');
  });

  it.each(RAW_ERROR_CASES)(
    'normalizes non-Error failure values into Error objects ($label)',
    ({ error }) => {
      expectThrowBoundaryToNormalizeFailure(
        () => throwIfFailure(failure(error)),
        error
      );
    }
  );

  it.each(RAW_ERROR_CASES)(
    'normalizes non-Error failure values into Error objects with NormalizedErrors ($label)',
    ({ error }) => {
      expectThrowBoundaryToNormalizeFailure(
        () => throwIfFailure(failure(error), NormalizedErrors),
        error
      );
    }
  );

  it('normalizes void failures into Error objects', () => {
    expectThrowBoundaryToNormalizeFailure(
      () => throwIfFailure(failure()),
      undefined
    );
  });

  it('normalizes void failures into Error objects with NormalizedErrors', () => {
    expectThrowBoundaryToNormalizeFailure(
      () => throwIfFailure(failure(), NormalizedErrors),
      undefined
    );
  });

  it('does not leak thrown coercion errors while normalizing failures', () => {
    const rawError = createUnstringifiableErrorValue();

    try {
      throwIfFailure(failure(rawError));
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBe('coercion boom');
      expect(thrown).toMatchObject({
        message: 'Unstringifiable error value',
        cause: rawError,
      });
      return;
    }

    throw new Error('Expected throwIfFailure() to throw');
  });

  it('uses custom normalizeError for non-Error failure values', () => {
    const rawError = { code: faker.string.uuid() } as const;
    const normalized = new Error('normalized', { cause: rawError });
    const normalizeError = vi.fn((error: unknown) => {
      expect(error).toBe(rawError);
      return normalized;
    });

    expect(() =>
      throwIfFailure(failure(rawError), { normalizeError })
    ).toThrow(normalized);
    expect(normalizeError).toHaveBeenCalledWith(rawError);
  });

  it('uses custom normalizeError for existing Error failure values', () => {
    const rawError = new Error(faker.string.uuid());
    const normalized = new Error('normalized', { cause: rawError });
    const normalizeError = vi.fn((error: unknown) => {
      expect(error).toBe(rawError);
      return normalized;
    });

    expect(() =>
      throwIfFailure(failure(rawError), { normalizeError })
    ).toThrow(normalized);
    expect(normalizeError).toHaveBeenCalledWith(rawError);
  });

  it('narrows the same union variable after the helper returns', () => {
    type ValueType = 123;
    type ErrorType = 'boom';

    const readData = () => {
      const result: Failable<ValueType, ErrorType> =
        Math.random() > 0.5
          ? success(123 as ValueType)
          : failure('boom' as ErrorType);

      throwIfFailure(result);

      return result.data;
    };

    void readData;
    expectTypeOf<ReturnType<typeof readData>>().toEqualTypeOf<ValueType>();
  });
});

describe('match()', () => {
  describe('Success receiver', () => {
    it('calls only onSuccess', () => {
      const onSuccess = vi.fn((data: number) => data.toString());
      const onFailure = vi.fn((error: string) => error.toUpperCase());

      success(faker.number.float()).match(onSuccess, onFailure);

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('passes data to onSuccess', () => {
      const value = faker.number.float();
      const onSuccess = vi.fn((data: number) => data.toString());
      const onFailure = vi.fn((error: string) => error.toUpperCase());

      success(value).match(onSuccess, onFailure);

      expect(onSuccess).toHaveBeenCalledWith(value);
    });

    it("doesn't invoke onFailure", () => {
      const onSuccess = vi.fn((data: number) => data.toString());
      const onFailure = vi.fn((error: string) => error.toUpperCase());

      success(faker.number.float()).match(onSuccess, onFailure);

      expect(onFailure).not.toHaveBeenCalled();
    });

    it('returns the onSuccess result', () => {
      const value = faker.number.float();
      const onSuccess = (data: number) => data.toString();

      const result = success(value).match(onSuccess, (error: string) =>
        error.toUpperCase()
      );

      expect(result).toBe(value.toString());
    });
  });

  describe('Failure receiver', () => {
    it("doesn't invoke onSuccess", () => {
      const onSuccess = vi.fn((data: number) => data.toString());
      const onFailure = vi.fn((error: string) => error.toUpperCase());

      failure('boom').match(onSuccess, onFailure);

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('calls only onFailure', () => {
      const onSuccess = vi.fn((data: number) => data.toString());
      const onFailure = vi.fn((error: string) => error.toUpperCase());

      failure('boom').match(onSuccess, onFailure);

      expect(onFailure).toHaveBeenCalledTimes(1);
    });

    it('passes error to onFailure', () => {
      const error = faker.string.uuid();
      const onSuccess = vi.fn((data: number) => data.toString());
      const onFailure = vi.fn((value: string) => value.toUpperCase());

      failure(error).match(onSuccess, onFailure);

      expect(onFailure).toHaveBeenCalledWith(error);
    });

    it('returns the onFailure result', () => {
      const error = faker.string.uuid();
      const onFailure = (value: string) => value.toUpperCase();

      const result = failure(error).match(
        (data: number) => data.toString(),
        onFailure
      );

      expect(result).toBe(error.toUpperCase());
    });
  });

  describe('Failable receiver', () => {
    it('infers the shared callback return type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';

      const result = createUnionFailable(
        123 as ValueType,
        'boom' as ErrorType
      ).match(
        (value) => value.toString(),
        (error) => error.toUpperCase()
      );

      expectTypeOf(result).toEqualTypeOf<string>();
    });

    it('infers callback parameter types for Success/Failure unions', () => {
      const result =
        Math.random() > 0.5
          ? success(25)
          : failure({ code: 'pricing_unavailable' });

      const status = result.match(
        (value) => {
          expectTypeOf(value).toEqualTypeOf<25>();
          return `Fee is ${value} cents`;
        },
        (error) => {
          expectTypeOf(error).toEqualTypeOf<{
            readonly code: 'pricing_unavailable';
          }>();
          return `Cannot quote fee: ${error.code}`;
        }
      );

      expectTypeOf(status).toEqualTypeOf<string>();
    });
  });
});

describe('run()', () => {
  describe('type inference spike', () => {
    function getHelperResult(): Failable<'helper-data', 'helper-error'> {
      return success('helper-data');
    }

    function getExplicitNeverSuccess(): Success<never> {
      return success(undefined as never);
    }

    it('infers yielded success data', () => {
      const buildResult = () =>
        run(function* () {
          const value = yield* success(123 as number);

          expectTypeOf(value).toEqualTypeOf<number>();

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Success<number>
      >();
      void buildResult;
    });

    it('infers direct `yield*` data from hydrated Success values', () => {
      const buildResult = () =>
        run(function* () {
          const value = yield* success(123);

          expectTypeOf(value).toEqualTypeOf<123>();

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Success<123>
      >();
      void buildResult;
    });

    it('keeps inline failure sources as Failure when success is unreachable', () => {
      const buildResult = () =>
        run(function* () {
          const value = yield* failure('inline-source-error');

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failure<'inline-source-error'>
      >();
      void buildResult;
    });

    it('keeps direct hydrated Failure sources as Failure when success is unreachable', () => {
      const buildResult = () =>
        run(function* () {
          const value = yield* failure('inline-source-error');

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failure<'inline-source-error'>
      >();
      void buildResult;
    });

    it('does not add yielded errors when the generator only returns success', () => {
      const buildResult = () =>
        run(function* () {
          return success(42);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Success<42>
      >();
      void buildResult;
    });

    it('preserves explicit Success<never> returns in sync builders', () => {
      const buildResult = () =>
        run(function* () {
          return getExplicitNeverSuccess();
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Success<never>
      >();
      void buildResult;
    });

    it('preserves explicit Success<never> returns in async builders', () => {
      const buildResult = () =>
        run(async function* () {
          return getExplicitNeverSuccess();
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<Success<never>>
      >();
      void buildResult;
    });

    it('preserves helper-produced Failable return types', () => {
      const buildResult = () =>
        run(function* () {
          return getHelperResult();
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failable<'helper-data', 'helper-error'>
      >();
      void buildResult;
    });

    it('infers direct sync helper `yield*` in sync builders', () => {
      const buildResult = () =>
        run(function* () {
          const value = yield* getHelperResult();

          expectTypeOf(value).toEqualTypeOf<'helper-data'>();

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failable<'helper-data', 'helper-error'>
      >();
      void buildResult;
    });

    it('distributes over yielded wrapper unions and returned Success or Failure', () => {
      const shouldUseString = true as boolean;

      const buildResult = () =>
        run(function* () {
          const wrapper = shouldUseString
            ? (success('wrapped-string') as Failable<
                'wrapped-string',
                'wrapped-string-error'
              >)
            : (success(123) as Failable<123, 'wrapped-number-error'>);
          const value = yield* wrapper;

          expectTypeOf(value).toEqualTypeOf<'wrapped-string' | 123>();

          return shouldUseString
            ? success(value)
            : failure('builder-error');
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failable<
          'wrapped-string' | 123,
          'wrapped-string-error' | 'wrapped-number-error' | 'builder-error'
        >
      >();
      void buildResult;
    });

    it('unions yielded source errors with explicit builder failures', () => {
      const firstSource = success('first-value') as Failable<
        'first-value',
        'first-source-error'
      >;
      const secondSource = success('second-value') as Failable<
        'second-value',
        'second-source-error'
      >;

      const buildResult = () =>
        run(function* () {
          const first = yield* firstSource;
          const second = yield* secondSource;

          void first;
          void second;

          return failure('builder-error');
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failure<'first-source-error' | 'second-source-error' | 'builder-error'>
      >();
      void buildResult;
    });

    it('unions yielded source errors from multiple sources when returning success', () => {
      const firstSource = success('first-value') as Failable<
        'first-value',
        'first-source-error'
      >;
      const secondSource = success('second-value') as Failable<
        'second-value',
        'second-source-error'
      >;

      const buildResult = () =>
        run(function* () {
          const first = yield* firstSource;
          const second = yield* secondSource;

          return success([first, second]);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failable<
          readonly ['first-value', 'second-value'],
          'first-source-error' | 'second-source-error'
        >
      >();
      void buildResult;
    });

    it('keeps yielded maybe-failure types when later returning explicit Success<never>', () => {
      const source = success(123) as Failable<123, 'source-error'>;

      const buildResult = () =>
        run(function* () {
          const value = yield* source;

          void value;
          return getExplicitNeverSuccess();
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toMatchTypeOf<
        Failable<never, 'source-error'>
      >();
      expectTypeOf<
        Extract<ReturnType<typeof buildResult>, Failure<unknown>>
      >().toEqualTypeOf<Failure<'source-error'>>();
      void buildResult;
    });

    it('preserves direct hydrated `Failable` yield types in sync builders', () => {
      const source = success(123) as Failable<123, 'source-error'>;

      const buildResult = () =>
        run(function* () {
          const value = yield* source;

          expectTypeOf(value).toEqualTypeOf<123>();

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failable<123, 'source-error'>
      >();
      void buildResult;
    });

    it('stays conservative when a guaranteed failure is anywhere in the yield set', () => {
      const source = success(123) as Failable<123, 'source-error'>;

      const buildResult = () =>
        run(function* () {
          const maybeValue = yield* source;
          const guaranteedValue = yield* failure('inline-source-error');

          void maybeValue;
          void guaranteedValue;
          return getExplicitNeverSuccess();
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failure<'source-error' | 'inline-source-error'>
      >();
      void buildResult;
    });

    it('keeps promised inline failure sources as Failure in async builders', () => {
      const buildResult = () =>
        run(async function* () {
          const value = yield* await Promise.resolve(
            failure('async-inline-source-error')
          );

          return success(value);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<Failure<'async-inline-source-error'>>
      >();
      void buildResult;
    });

    it('infers promised unions of raw success and failure sources in async builders', () => {
      async function getUser(userId: string) {
        if (userId === '') {
          return failure('missing-user-id');
        }

        if (userId === 'offline') {
          return failure('network-error');
        }

        return success({ id: userId });
      }

      const buildResult = () =>
        run(async function* () {
          const user = yield* await getUser('123');

          expectTypeOf(user).toEqualTypeOf<{ readonly id: string }>();

          return success(user);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<
          Failable<{ readonly id: string }, 'missing-user-id' | 'network-error'>
        >
      >();
      void buildResult;
    });

    it('unions promised source errors from multiple sources when returning success', () => {
      async function getFirstValue(id: string) {
        if (id === '') {
          return failure('missing-first-id');
        }

        if (id === 'offline') {
          return failure('first-network-error');
        }

        return success({ id, kind: 'first' });
      }

      async function getSecondValue(id: string) {
        if (id === '') {
          return failure('missing-second-id');
        }

        if (id === 'offline') {
          return failure('second-network-error');
        }

        return success({ id, kind: 'second' });
      }

      const buildResult = () =>
        run(async function* () {
          const first = yield* await getFirstValue('123');
          const second = yield* await getSecondValue('456');

          return success({ first, second });
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<
          Failable<
            {
              readonly first: { readonly id: string; readonly kind: 'first' };
              readonly second: { readonly id: string; readonly kind: 'second' };
            },
            | 'missing-first-id'
            | 'first-network-error'
            | 'missing-second-id'
            | 'second-network-error'
          >
        >
      >();
      void buildResult;
    });

    it('infers mixed sync and async yielded payloads in async builders', () => {
      const buildResult = () =>
        run(async function* () {
          const syncValue = yield* success(123);
          const asyncValue = yield* await Promise.resolve(
            success('async-value')
          );

          expectTypeOf(syncValue).toEqualTypeOf<123>();
          expectTypeOf(asyncValue).toEqualTypeOf<'async-value'>();

          return success([syncValue, asyncValue]);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<Success<readonly [123, 'async-value']>>
      >();
      void buildResult;
    });

    it('infers direct sync helper `yield*` alongside `yield* await ...` in async builders', () => {
      async function getAsyncValue() {
        return success('async-value');
      }

      const buildResult = () =>
        run(async function* () {
          const syncValue = yield* getHelperResult();
          const asyncValue = yield* await getAsyncValue();

          expectTypeOf(syncValue).toEqualTypeOf<'helper-data'>();
          expectTypeOf(asyncValue).toEqualTypeOf<'async-value'>();

          return success([syncValue, asyncValue]);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<
          Failable<readonly ['helper-data', 'async-value'], 'helper-error'>
        >
      >();
      void buildResult;
    });

    it('infers direct hydrated `yield*` alongside `yield* await ...` for promised sources in async builders', () => {
      const source = success('direct-value') as Failable<
        'direct-value',
        'direct-source-error'
      >;

      const buildResult = () =>
        run(async function* () {
          const syncValue = yield* success(123);
          const directValue = yield* source;
          const asyncValue = yield* await Promise.resolve(
            success('async-value')
          );

          expectTypeOf(syncValue).toEqualTypeOf<123>();
          expectTypeOf(directValue).toEqualTypeOf<'direct-value'>();
          expectTypeOf(asyncValue).toEqualTypeOf<'async-value'>();

          return success([syncValue, directValue, asyncValue]);
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<
          Failable<
            readonly [123, 'direct-value', 'async-value'],
            'direct-source-error'
          >
        >
      >();
      void buildResult;
    });

    it('unions promised source errors with explicit async builder failures', () => {
      const firstSource = success('first-value') as Failable<
        'first-value',
        'first-source-error'
      >;
      const secondSource = success('second-value') as Failable<
        'second-value',
        'second-source-error'
      >;

      const buildResult = () =>
        run(async function* () {
          const first = yield* await Promise.resolve(firstSource);
          const second = yield* secondSource;

          void first;
          void second;

          return failure('builder-error');
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<
          Failure<
            'first-source-error' | 'second-source-error' | 'builder-error'
          >
        >
      >();
      void buildResult;
    });

    it('preserves helper-produced Failable return types in async builders', () => {
      const buildResult = () =>
        run(async function* () {
          return getHelperResult();
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<Failable<'helper-data', 'helper-error'>>
      >();
      void buildResult;
    });

    it('rejects raw return values at type level', () => {
      const buildRawReturn = () => {
        // @ts-expect-error `run(...)` builders must return a `Failable`.
        return run(function* () {
          return 123;
        });
      };

      void buildRawReturn;
    });

    it('rejects success-like plain-object return values at type level', () => {
      const buildSuccessLikeReturn = () => {
        // @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
        return run(function* () {
          return createRunReturnSuccessLike(123);
        });
      };

      void buildSuccessLikeReturn;
    });

    it('rejects failure-like plain-object return values at type level', () => {
      const buildFailureLikeReturn = () => {
        // @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
        return run(function* () {
          return createRunReturnFailureLike('boom');
        });
      };

      void buildFailureLikeReturn;
    });

    it('rejects success-like plain-object return values from async builders at type level', () => {
      const buildAsyncSuccessLikeReturn = () => {
        // @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
        return run(async function* () {
          return createRunReturnSuccessLike(123);
        });
      };

      void buildAsyncSuccessLikeReturn;
    });

    it('rejects failure-like plain-object return values from async builders at type level', () => {
      const buildAsyncFailureLikeReturn = () => {
        // @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
        return run(async function* () {
          return createRunReturnFailureLike('boom');
        });
      };

      void buildAsyncFailureLikeReturn;
    });

    it('treats empty generators as Success<void>', () => {
      const buildResult = () =>
        run(function* () {
          return;
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Success<void>
      >();
      void buildResult;
    });

    it('infers never when the builder only throws', () => {
      const buildResult = () =>
        run(function* () {
          throw new Error('boom');
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<never>();
      void buildResult;
    });

    it('infers Promise<never> when the async builder only throws', () => {
      const buildResult = () =>
        run(async function* () {
          throw new Error('boom');
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<never>
      >();
      void buildResult;
    });

    it('preserves yielded failure types when later code only throws', () => {
      const source = success(123) as Failable<123, 'source-error'>;

      const buildResult = () =>
        run(function* () {
          const value = yield* source;

          void value;
          throw new Error('boom');
        });

      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Failure<'source-error'>
      >();
      void buildResult;
    });

    it('rejects promised sources in sync builders at type level', () => {
      const buildResult = () =>
        run(function* () {
          // @ts-expect-error sync `run(...)` only accepts hydrated `Failable` values.
          const value = yield* Promise.resolve(success(123));

          return success(value);
        });

      void buildResult;
    });

    it('rejects direct promised sources in async builders at type level', () => {
      const buildResult = () =>
        run(async function* () {
          // @ts-expect-error promised sources must be awaited before `yield*`.
          const value = yield* Promise.resolve(success(123));

          return success(value);
        });

      void buildResult;
    });

    it('rejects async builder helper injection at type level', () => {
      const buildResult = () =>
        run(
          async function* (
            // @ts-expect-error `run(...)` no longer injects combinator helpers.
            { all: runAll }
          ) {
            const [a] = yield* await runAll(Promise.resolve(success(1)));

            return success(a);
          }
        );

      void buildResult;
    });

    it('infers tuple data types from all() when only Promise<Success> is passed', () => {
      const buildResult = () =>
        run(async function* () {
          const [a, b] = yield* await all(
            Promise.resolve(success(1)),
            Promise.resolve(success('two'))
          );
          expectTypeOf(a).toEqualTypeOf<1>();
          expectTypeOf(b).toEqualTypeOf<'two'>();
          return success([a, b]);
        });

      void buildResult;
    });

    it('infers run() result as Failure when only Promise<Failure> is passed to all()', () => {
      const buildResult = () =>
        run(async function* () {
          const result = yield* await all(
            Promise.resolve(failure('e1')),
            Promise.resolve(failure(42))
          );
          return success(result);
        });
      // When all args are Failure, all() never yields success → return type is never; run() returns Failure.
      void buildResult;
    });

    it('infers tuple data types from all() when Success and Failable (no Failure) are passed', () => {
      const buildResult = () =>
        run(async function* () {
          const p2: Promise<Failable<boolean, string>> = Promise.resolve(
            success(true)
          );
          const [a, b] = yield* await all(
            success(1),
            p2
          );
          expectTypeOf(a).toEqualTypeOf<1>();
          expectTypeOf(b).toEqualTypeOf<boolean>();
          return success([a, b]);
        });
      void buildResult;
    });

    it('infers Success tuple entries when Promise<Success> is passed to allSettled()', () => {
      const buildResult = () =>
        run(async function* () {
          const [r1, r2] = await allSettled(
            Promise.resolve(success(1)),
            Promise.resolve(success('two'))
          );
          expectTypeOf(r1).toEqualTypeOf<Success<1>>();
          expectTypeOf(r2).toEqualTypeOf<Success<'two'>>();
          return success([r1, r2]);
        });
      void buildResult;
    });

    it('infers Failure tuple entries when Promise<Failure> is passed to allSettled()', () => {
      const buildResult = () =>
        run(async function* () {
          const [r1, r2] = await allSettled(
            Promise.resolve(failure('err1')),
            Promise.resolve(failure(42))
          );
          expectTypeOf(r1).toEqualTypeOf<Failure<'err1'>>();
          expectTypeOf(r2).toEqualTypeOf<Failure<42>>();
          return success([r1, r2]);
        });
      void buildResult;
    });

    it('infers Failable tuple entries when Promise<Failable> is passed to allSettled()', () => {
      const buildResult = () =>
        run(async function* () {
          const p1: Promise<Failable<number, string>> = Promise.resolve(
            success(1)
          );
          const p2: Promise<Failable<boolean, string>> = Promise.resolve(
            failure('x')
          );
          const [r1, r2] = await allSettled(p1, p2);
          expectTypeOf(r1).toEqualTypeOf<Failable<number, string>>();
          expectTypeOf(r2).toEqualTypeOf<Failable<boolean, string>>();
          return success([r1, r2]);
        });
      void buildResult;
    });

    it('infers Success, Failure, and Failable tuple entries from allSettled() when all three are passed', () => {
      const buildResult = () =>
        run(async function* () {
          const p3: Promise<Failable<boolean, string>> = Promise.resolve(
            failure('f')
          );
          const [r1, r2, r3] = await allSettled(
            Promise.resolve(success(1)),
            Promise.resolve(failure('err')),
            p3
          );
          expectTypeOf(r1).toEqualTypeOf<Success<1>>();
          expectTypeOf(r2).toEqualTypeOf<Failure<'err'>>();
          expectTypeOf(r3).toEqualTypeOf<Failable<boolean, string>>();
          return success([r1, r2, r3]);
        });
      void buildResult;
    });

    it('infers data union from race() when only Promise<Success> is passed', () => {
      const buildResult = () =>
        run(async function* () {
          const x = yield* await race(
            Promise.resolve(success(1)),
            Promise.resolve(success('two'))
          );
          expectTypeOf(x).toEqualTypeOf<1 | 'two'>();
          return success(x);
        });

      void buildResult;
    });

    it('infers run() result as Failure when only Promise<Failure> is passed to race()', () => {
      const buildResult = () =>
        run(async function* () {
          const result = yield* await race(
            Promise.resolve(failure('e1')),
            Promise.resolve(failure(42))
          );
          return success(result);
        });
      void buildResult;
      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<Failure<'e1' | 42>>
      >();
    });

    it('infers data/error union from race() when Success, Failure, and Failable are passed', () => {
      const buildResult = () =>
        run(async function* () {
          const p3: Promise<Failable<boolean, string>> = Promise.resolve(
            success(false)
          );
          const x = yield* await race(
            Promise.resolve(success(1)),
            Promise.resolve(failure('err')),
            p3
          );
          return success(x);
        });
      void buildResult;
      expectTypeOf<ReturnType<typeof buildResult>>().toEqualTypeOf<
        Promise<Failable<1 | boolean, 'err' | string>>
      >();
    });

    it('supports sync all() in sync builders', () => {
      const buildResult = () =>
        run(function* () {
          const [a, b] = yield* all(success(1), success('two'));

          expectTypeOf(a).toEqualTypeOf<1>();
          expectTypeOf(b).toEqualTypeOf<'two'>();

          return success([a, b]);
        });

      void buildResult;
    });

    it('rejects promised all() in sync builders at type level', () => {
      const buildResult = () => {
        const promised = all(Promise.resolve(success(1)));

        return run(function* () {
          // @ts-expect-error sync generators cannot yield* promised sources.
          const [a] = yield* promised;

          return success(a);
        });
      };

      void buildResult;
    });

    it('rejects sync sources passed to race() at type level', () => {
      const buildResult = () => {
        // @ts-expect-error `race()` only accepts promised `Failable` sources.
        const result = race(success(1));

        return result;
      };

      void buildResult;
    });
  });

  describe('runtime', () => {
    it('returns Success when all yielded sources succeed', () => {
      const result = run(function* () {
        const left = yield* success(20);
        const right = yield* success(22);

        return success(left + right);
      });

      expect(result).toStrictEqual(success(42));
    });

    it('supports direct sync helper `yield*` in sync builders', () => {
      function getUserId(): Failable<'123', 'missing-user-id'> {
        return success('123');
      }

      const result = run(function* () {
        const userId = yield* getUserId();

        return success(userId);
      });

      expect(result).toStrictEqual(success('123'));
    });

    it('supports direct `yield*` on hydrated Success values', () => {
      const result = run(function* () {
        const left = yield* success(20);
        const right = yield* success(22);

        return success(left + right);
      });

      expect(result).toStrictEqual(success(42));
    });

    it('exposes sync and async iterators on hydrated `Failable` values for `run(...)` delegation', () => {
      const ok = success(123);
      const problem = failure('boom');

      expect(Symbol.iterator in ok).toBe(true);
      expect(Symbol.asyncIterator in ok).toBe(true);
      expect(Symbol.iterator in problem).toBe(true);
      expect(Symbol.asyncIterator in problem).toBe(true);
    });

    it('supports mixed sync and async `yield* await ...` steps in async builders', async () => {
      const result = await run(async function* () {
        const left = yield* success(20);
        const right = yield* await Promise.resolve(success(22));

        return success(left + right);
      });

      expect(result).toStrictEqual(success(42));
    });

    it('supports direct hydrated `yield*` in async builders alongside promised sources', async () => {
      const source = success('ready') as Failable<'ready', 'source-error'>;

      const result = await run(async function* () {
        const left = yield* success(20);
        const directValue = yield* source;
        const right = yield* await Promise.resolve(success(22));

        return success([left, directValue, right]);
      });

      expect(result).toStrictEqual(success([20, 'ready', 22]));
    });

    it('returns inline Failure values from direct `yield* failure(...)` in async builders', async () => {
      const result = await run(async function* () {
        const value = yield* failure('async-inline-failure');

        return success(value);
      });

      expect(result).toStrictEqual(failure('async-inline-failure'));
    });

    it('runs direct `yield*` cleanup in async finally blocks before returning the first Failure', async () => {
      const original = failure('async-direct-cleanup-failure');
      let cleanedUp = false;

      const result = await run(async function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          yield* success('cleanup-step');
          cleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(cleanedUp).toBe(true);
    });

    it('short-circuits direct sync helper `yield*` before promised async steps in async builders', async () => {
      const original = failure('missing-user-id');
      let reachedPromisedStep = false;

      function getUserId(): Failable<string, 'missing-user-id'> {
        return original;
      }

      async function getUser(userId: string) {
        reachedPromisedStep = true;
        return success({ id: userId });
      }

      const result = await run(async function* () {
        const userId = yield* getUserId();
        const user = yield* await getUser(userId);

        return success(user);
      });

      expect(result).toBe(original);
      expect(reachedPromisedStep).toBe(false);
    });

    it('supports custom PromiseLike success sources in async builders', async () => {
      const result = await run(async function* () {
        const left = yield* success(20);
        const right = yield* await createResolvingThenable(
          success(22)
        );

        return success(left + right);
      });

      expect(result).toStrictEqual(success(42));
    });

    it('all() returns tuple data for direct sync sources', () => {
      const result = all(success(1), success(2));

      expect(result).toStrictEqual(success([1, 2]));
    });

    it('all() resolves promised Failable sources in parallel and returns tuple on success', async () => {
      const result = await run(async function* () {
        const [a, b] = yield* await all(
          Promise.resolve(success(1)),
          Promise.resolve(success(2))
        );
        return success(a + b);
      });
      expect(result).toStrictEqual(success(3));
    });

    it('all() returns first failure when one source fails', async () => {
      const err = failure('first-error');
      const result = await run(async function* () {
        yield* await all(Promise.resolve(success(1)), Promise.resolve(err));
        return success(0);
      });
      expect(result).toStrictEqual(err);
    });

    it('all() returns first failure in input order when multiple fail', async () => {
      const err1 = failure('error-1');
      const err2 = failure('error-2');
      const result = await run(async function* () {
        yield* await all(
          Promise.resolve(success(1)),
          Promise.resolve(err1),
          Promise.resolve(err2)
        );
        return success(0);
      });
      expect(result).toStrictEqual(err1);
    });

    it('allSettled() returns a settled tuple for direct sync sources', () => {
      const result = allSettled(success(1), failure('e2'));

      expect(result).toStrictEqual([success(1), failure('e2')]);
    });

    it('allSettled() returns a settled tuple when all sources succeed', async () => {
      const result = await run(async function* () {
        const [a, b] = await allSettled(
          Promise.resolve(success(1)),
          Promise.resolve(success(2))
        );
        if (a.status !== 'success' || b.status !== 'success')
          return failure('unexpected');
        return success(a.data + b.data);
      });
      expect(result).toStrictEqual(success(3));
    });

    it('allSettled() returns a settled tuple when one fails', async () => {
      const err = failure('e1');
      const result = await run(async function* () {
        const [r1, r2] = await allSettled(
          Promise.resolve(success(1)),
          Promise.resolve(err)
        );
        expect(r1.status).toBe('success');
        expect((r1 as Success<number>).data).toBe(1);
        expect(r2.status).toBe('failure');
        expect((r2 as Failure<'e1'>).error).toBe('e1');
        return success('ok');
      });
      expect(result).toStrictEqual(success('ok'));
    });

    it('allSettled() returns a settled tuple when all fail', async () => {
      const result = await run(async function* () {
        const [a, b] = await allSettled(
          Promise.resolve(failure('a')),
          Promise.resolve(failure('b'))
        );
        expect(a.status).toBe('failure');
        expect(b.status).toBe('failure');
        return success([(a as Failure<'a'>).error, (b as Failure<'b'>).error]);
      });
      expect(result).toStrictEqual(success(['a', 'b']));
    });

    it('allSettled() captures rejected promised sources as Failure values', async () => {
      // Bypass the best-effort type guardrail to verify runtime capture.
      const result = await allSettled(
        Promise.reject('boom') as PromiseLike<Failable<never, 'boom'>>
      );

      expect(result).toStrictEqual([failure('boom')]);
    });

    it('allSettled() preserves order across successes, failures, and rejected promises', async () => {
      // Bypass the best-effort type guardrail to verify runtime capture.
      const rejectedSource: PromiseLike<Failable<never, 'rejected'>> =
        Promise.resolve().then(() => {
          throw 'rejected';
        });

      const result = await allSettled(
        Promise.resolve(success(1)),
        Promise.resolve(failure('failed')),
        rejectedSource
      );

      expect(result).toStrictEqual([
        success(1),
        failure('failed'),
        failure('rejected'),
      ]);
    });

    it('allSettled() captures rejected PromiseLike sources as Failure values', async () => {
      const rejectedSource = createRejectingThenable<
        Failable<never, 'thenable-error'>
      >('thenable-error');

      const result = await allSettled(rejectedSource);

      expect(result).toStrictEqual([failure('thenable-error')]);
    });

    it('allSettled() lets async run() builders observe promised source rejections as settled Failure values', async () => {
      // Bypass the best-effort type guardrail to verify runtime capture.
      const rejectedSource: PromiseLike<Failable<never, 'missing-profile'>> =
        Promise.resolve().then(() => {
          throw 'missing-profile';
        });

      const result = await run(async function* () {
        const [user, profile] = await allSettled(
          Promise.resolve(success('user')),
          rejectedSource
        );

        expect(user).toStrictEqual(success('user'));
        expect(profile).toStrictEqual(failure('missing-profile'));
        return success('ok');
      });

      expect(result).toStrictEqual(success('ok'));
    });

    it('race() returns first success when it settles first', async () => {
      const slow = new Promise<Success<1>>((resolve) => {
        setTimeout(() => resolve(success(1)), 20);
      });
      const fast = Promise.resolve(success(2));

      const result = await run(async function* () {
        const a = yield* await race(slow, fast);
        return success(a);
      });
      expect(result).toStrictEqual(success(2));
    });

    it('race() returns first failure when it settles first', async () => {
      const err = failure('first-error');
      const slow = new Promise<Success<number>>((resolve) => {
        setTimeout(() => resolve(success(1)), 20);
      });
      const result = await run(async function* () {
        yield* await race(slow, Promise.resolve(err));
        return success(0);
      });
      expect(result).toStrictEqual(err);
    });

    it('race() rejects zero promised sources with a clear error', async () => {
      await expect(race()).rejects.toThrow(
        '`race()` requires at least one promised `Failable` source.'
      );
    });

    it('race() with one promise returns that result', async () => {
      const result = await run(async function* () {
        const a = yield* await race(Promise.resolve(success(42)));
        return success(a);
      });
      expect(result).toStrictEqual(success(42));
    });

    it('returns Success<void> for empty generators', () => {
      const result = run(function* () {
        return;
      });

      expect(result).toStrictEqual(success(undefined));
    });

    it('returns explicit success when no sources are yielded', () => {
      const result = run(function* () {
        return success(42);
      });

      expect(result).toStrictEqual(success(42));
    });

    it('returns inline Failure values from direct `yield* failure(...)`', () => {
      const result = run(function* () {
        const value = yield* failure('inline-failure');

        return success(value);
      });

      expect(result).toStrictEqual(failure('inline-failure'));
    });

    it('returns inline Failure values from direct `yield* failure(...)`', () => {
      const result = run(function* () {
        const value = yield* failure('inline-failure');

        return success(value);
      });

      expect(result).toStrictEqual(failure('inline-failure'));
    });

    it('supports direct `yield*` on hydrated `Failable` values', () => {
      const source = success(42) as Failable<42, 'source-error'>;

      const result = run(function* () {
        const value = yield* source;

        return success(value);
      });

      expect(result).toStrictEqual(success(42));
    });

    it('returns the original Failure instance unchanged', () => {
      const original = failure('original-failure');
      const result = run(function* () {
        const value = yield* original;

        return success(value);
      });

      expect(result).toBe(original);
    });

    it('returns the original promised Failure instance unchanged', async () => {
      const original = failure('promised-failure');
      const result = await run(async function* () {
        const value = yield* await Promise.resolve(original);

        return success(value);
      });

      expect(result).toBe(original);
    });

    it('stops executing after the first Failure', () => {
      const original = failure('short-circuit-failure');
      let reachedLaterStep = false;

      const result = run(function* () {
        yield* original;
        reachedLaterStep = true;

        return success('unreachable');
      });

      expect(result).toBe(original);
      expect(reachedLaterStep).toBe(false);
    });

    it('runs finally blocks before returning the first yielded Failure', () => {
      const original = failure('cleanup-failure');
      let cleanedUp = false;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          cleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(cleanedUp).toBe(true);
    });

    it('runs async `yield* await ...` cleanup before returning the first Failure', async () => {
      const original = failure('cleanup-failure');
      let cleanedUp = false;

      const result = await run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable');
        } finally {
          yield* await Promise.resolve(success('cleanup-step'));
          cleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(cleanedUp).toBe(true);
    });

    it('drains direct `yield*` cleanup in finally blocks before returning the first Failure', () => {
      const original = failure('cleanup-yield-failure');
      let cleanedUp = false;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          yield* success('cleanup-step');
          cleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(cleanedUp).toBe(true);
    });

    it('drains direct `yield* result` cleanup in finally blocks before returning the first Failure', () => {
      const original = failure('cleanup-direct-yield-failure');
      let cleanedUp = false;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          yield* success('cleanup-step');
          cleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(cleanedUp).toBe(true);
    });

    it('ignores success data yielded during finally cleanup while unwinding a failure', () => {
      const original = failure('cleanup-failure');
      let step1 = false;
      let step2 = false;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          yield* success('ignored');
          step1 = true;
          yield* success('also-ignored');
          step2 = true;
        }
      });

      expect(result).toBe(original);
      expect(step1).toBe(true);
      expect(step2).toBe(true);
    });

    /* eslint-disable no-unsafe-finally -- intentional regression coverage for run() last-return-wins unwind semantics */
    it('lets explicit Success cleanup returns override yielded Failures', () => {
      const original = failure('original-failure');
      const cleanup = success('cleanup-success');

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
    });

    it('lets explicit Failure cleanup returns override yielded Failures', () => {
      const original = failure('original-failure');
      const cleanup = failure('cleanup-failure');

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
    });

    it('lets union-typed cleanup Failable returns override yielded Failures', () => {
      const original = failure('original-failure');
      const cleanup = success('cleanup-success') as Failable<
        'cleanup-success',
        'cleanup-failure'
      >;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
    });

    it('treats bare cleanup returns as success() during failure unwinding', () => {
      const original = failure('original-failure');

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          return;
        }
      });

      expect(result).toStrictEqual(success());
    });

    it('lets explicit cleanup returns win after draining yielded Success cleanup steps', () => {
      const original = failure('original-failure');
      const cleanup = success('cleanup-success');
      let cleanedUp = false;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          yield* success('cleanup-step');
          cleanedUp = true;
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
      expect(cleanedUp).toBe(true);
    });

    it('uses the last cleanup return reached during nested failure unwinding', () => {
      const original = failure('original-failure');
      const outerCleanup = failure('outer-cleanup-failure');
      let outerCleanupRan = false;

      const result = run(function* () {
        try {
          try {
            yield* original;

            return success('unreachable');
          } finally {
            return success('inner-cleanup-success');
          }
        } finally {
          outerCleanupRan = true;
          return outerCleanup;
        }
      });

      expect(result).toBe(outerCleanup);
      expect(outerCleanupRan).toBe(true);
    });

    it('returns the explicit failure even if a finally block yields a different failure', () => {
      const original = failure('original-failure');
      let cleanedUp = false;

      const result = run(function* () {
        try {
          yield* original;

          return success('unreachable');
        } finally {
          yield* failure('cleanup-err');
          cleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(cleanedUp).toBe(false);
    });

    it('continues unwinding outer finally blocks when cleanup yields Failure during failure unwinding', async () => {
      const original = failure('cleanup-base-failure');
      let outerCleanedUp = false;

      const result = await run(async function* () {
        try {
          try {
            yield* await Promise.resolve(original);

            return success('unreachable');
          } finally {
            yield* failure('cleanup-failure');
          }
        } finally {
          outerCleanedUp = true;
        }
      });

      expect(result).toBe(original);
      expect(outerCleanedUp).toBe(true);
    });

    it('lets explicit Success cleanup returns override yielded async Failures', async () => {
      const original = failure('original-failure');
      const cleanup = success('cleanup-success');

      const result = await run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable');
        } finally {
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
    });

    it('lets explicit Failure cleanup returns override yielded async Failures', async () => {
      const original = failure('original-failure');
      const cleanup = failure('cleanup-failure');

      const result = await run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable');
        } finally {
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
    });

    it('lets union-typed async cleanup Failable returns override yielded Failures', async () => {
      const original = failure('original-failure');
      const cleanup = success('cleanup-success') as Failable<
        'cleanup-success',
        'cleanup-failure'
      >;

      const result = await run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable');
        } finally {
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
    });

    it('treats bare async cleanup returns as success() during failure unwinding', async () => {
      const original = failure('original-failure');

      const result = await run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable');
        } finally {
          return;
        }
      });

      expect(result).toStrictEqual(success());
    });

    it('lets async cleanup returns win after draining yielded Success cleanup steps', async () => {
      const original = failure('original-failure');
      const cleanup = success('cleanup-success');
      let cleanedUp = false;

      const result = await run(async function* () {
        try {
          yield* await Promise.resolve(original);

          return success('unreachable');
        } finally {
          yield* await Promise.resolve(success('cleanup-step'));
          cleanedUp = true;
          return cleanup;
        }
      });

      expect(result).toBe(cleanup);
      expect(cleanedUp).toBe(true);
    });

    it('uses the last async cleanup return reached during nested failure unwinding', async () => {
      const original = failure('original-failure');
      const outerCleanup = failure('outer-cleanup-failure');
      let outerCleanupRan = false;

      const result = await run(async function* () {
        try {
          try {
            yield* await Promise.resolve(original);

            return success('unreachable');
          } finally {
            return success('inner-cleanup-success');
          }
        } finally {
          outerCleanupRan = true;
          return outerCleanup;
        }
      });

      expect(result).toBe(outerCleanup);
      expect(outerCleanupRan).toBe(true);
    });

    it('rejects promised source rejections unchanged in the main path', async () => {
      const rejection = { code: 'main-rejection' } as const;

      await expect(
        run(async function* () {
          yield* await createRejectingThenable<
            Failable<never, never>
          >(rejection);

          return success('unreachable');
        })
      ).rejects.toBe(rejection);
    });

    it('runs finally blocks before rejecting promised source rejections in the main path', async () => {
      const rejection = { code: 'main-rejection' } as const;
      let cleanedUp = false;

      await expect(
        run(async function* () {
          try {
            yield* await createRejectingThenable<
              Failable<never, never>
            >(rejection);

            return success('unreachable');
          } finally {
            cleanedUp = true;
          }
        })
      ).rejects.toBe(rejection);
      expect(cleanedUp).toBe(true);
    });

    it('drains async `yield* await ...` cleanup before rejecting promised source rejections in the main path', async () => {
      const rejection = { code: 'main-rejection' } as const;
      let cleanedUp = false;

      await expect(
        run(async function* () {
          try {
            yield* await createRejectingThenable<
              Failable<never, never>
            >(rejection);

            return success('unreachable');
          } finally {
            yield* await Promise.resolve(success('cleanup-step'));
            cleanedUp = true;
          }
        })
      ).rejects.toBe(rejection);
      expect(cleanedUp).toBe(true);
    });

    it('uses the last cleanup return during main-path rejection unwinding', async () => {
      const rejection = { code: 'main-rejection' } as const;
      const outerCleanup = failure('outer-cleanup-failure');
      let outerCleanupRan = false;

      const result = await run(async function* () {
        try {
          try {
            yield* await createRejectingThenable<Failable<never, never>>(
              rejection
            );

            return success('unreachable');
          } finally {
            return success('inner-cleanup-success');
          }
        } finally {
          outerCleanupRan = true;
          return outerCleanup;
        }
      });

      expect(result).toBe(outerCleanup);
      expect(outerCleanupRan).toBe(true);
    });
    /* eslint-enable no-unsafe-finally */

    it('uses the cleanup rejection when cleanup also rejects', async () => {
      const rejection = { code: 'main-rejection' } as const;
      const cleanupRejection = { code: 'cleanup-rejection' } as const;

      await expect(
        run(async function* () {
          try {
            yield* await createRejectingThenable<
              Failable<never, never>
            >(rejection);

            return success('unreachable');
          } finally {
            yield* await createRejectingThenable<
              Failable<never, never>
            >(cleanupRejection);
          }
        })
      ).rejects.toBe(cleanupRejection);
    });

    it('lets direct cleanup throws replace main-path promised source rejections', async () => {
      const rejection = { code: 'main-rejection' } as const;
      const cleanupError = { code: 'cleanup-throw' } as const;

      await expect(
        run(async function* () {
          try {
            yield* await createRejectingThenable<
              Failable<never, never>
            >(rejection);

            return success('unreachable');
          } finally {
            throwDirectly(cleanupError);
          }
        })
      ).rejects.toBe(cleanupError);
    });

    it('returns the cleanup Failure when cleanup yields Failure during main-path rejection unwinding', async () => {
      const rejection = { code: 'main-rejection' } as const;
      const cleanupFailure = failure('cleanup-failure');
      let outerCleanedUp = false;

      await expect(
        run(async function* () {
          try {
            try {
              yield* await createRejectingThenable<
                Failable<never, never>
              >(rejection);

              return success('unreachable');
            } finally {
              yield* cleanupFailure;
            }
          } finally {
            outerCleanedUp = true;
          }
        })
      ).resolves.toBe(cleanupFailure);
      expect(outerCleanedUp).toBe(true);
    });

    it('continues unwinding outer finally blocks when cleanup rejects during main-path rejection unwinding', async () => {
      const rejection = { code: 'main-rejection' } as const;
      const cleanupRejection = { code: 'cleanup-rejection' } as const;
      let outerCleanedUp = false;

      await expect(
        run(async function* () {
          try {
            try {
              yield* await createRejectingThenable<
                Failable<never, never>
              >(rejection);

              return success('unreachable');
            } finally {
              yield* await createRejectingThenable<
                Failable<never, never>
              >(cleanupRejection);
            }
          } finally {
            outerCleanedUp = true;
          }
        })
      ).rejects.toBe(cleanupRejection);
      expect(outerCleanedUp).toBe(true);
    });

    it('rejects promised source rejections unchanged during cleanup', async () => {
      const original = failure('cleanup-base-failure');
      const rejection = { code: 'cleanup-rejection' } as const;

      await expect(
        run(async function* () {
          try {
            yield* await Promise.resolve(original);

            return success('unreachable');
          } finally {
            yield* await createRejectingThenable<
              Failable<never, never>
            >(rejection);
          }
        })
      ).rejects.toBe(rejection);
    });

    it('continues unwinding outer finally blocks when cleanup rejects during failure unwinding', async () => {
      const original = failure('cleanup-base-failure');
      const rejection = { code: 'cleanup-rejection' } as const;
      let outerCleanedUp = false;

      await expect(
        run(async function* () {
          try {
            try {
              yield* await Promise.resolve(original);

              return success('unreachable');
            } finally {
              yield* await createRejectingThenable<
                Failable<never, never>
              >(rejection);
            }
          } finally {
            outerCleanedUp = true;
          }
        })
      ).rejects.toBe(rejection);
      expect(outerCleanedUp).toBe(true);
    });

    it('returns explicit builder failures', () => {
      const result = run(function* () {
        return failure('builder-failure');
      });

      expect(result).toStrictEqual(failure('builder-failure'));
    });

    it('preserves helper-returned Failable results', () => {
      const original = success('helper-data') as Failable<
        'helper-data',
        'helper-error'
      >;
      const getHelperResult = (): Failable<'helper-data', 'helper-error'> =>
        original;

      const result = run(function* () {
        return getHelperResult();
      });

      expect(result).toBe(original);
    });

    it('rethrows foreign values unchanged', () => {
      const foreignValue = { code: 'foreign-throw' } as const;

      try {
        run(function* () {
          yield* success('safe-step');
          throw foreignValue;
        });
      } catch (error) {
        expect(error).toBe(foreignValue);
        return;
      }

      throw new Error('Expected `run(...)` to rethrow the foreign value');
    });

    it('rejects raw async `yield value` even when the value is a hydrated `Failable`', async () => {
      try {
        await run(async function* () {
          yield success(123);

          return success(123);
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must use `yield*` only with hydrated `Failable` values. Use `yield* helper()` for sync helpers and `yield* await promisedHelper()` for promised sources.'
        );
        return;
      }

      throw new Error(
        'Expected async `run(...)` to reject invalid yielded values'
      );
    });

    it('rejects raw `yield value` even when the value is a hydrated `Failable`', () => {
      try {
        run(function* () {
          yield success(123);

          return success(123);
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must use `yield*` only with hydrated `Failable` values. Use `yield* helper()` for sync helpers and `yield* await promisedHelper()` for promised sources.'
        );
        return;
      }

      throw new Error('Expected `run(...)` to reject invalid yielded values');
    });

    it('rejects raw runtime return values', () => {
      try {
        run(function* () {
          return 123;
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must return a `Failable` or finish without returning a value.'
        );
        return;
      }

      throw new Error('Expected `run(...)` to reject raw return values');
    });

    it('rejects raw runtime return values from async builders', async () => {
      try {
        await run(async function* () {
          return 123;
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must return a `Failable` or finish without returning a value.'
        );
        return;
      }

      throw new Error('Expected async `run(...)` to reject raw return values');
    });

    it('rejects success-like plain-object return values at runtime', () => {
      try {
        run(function* () {
          return createRunReturnSuccessLike(123);
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must return a `Failable` or finish without returning a value.'
        );
        return;
      }

      throw new Error(
        'Expected `run(...)` to reject success-like plain-object return values'
      );
    });

    it('rejects failure-like plain-object return values at runtime', () => {
      try {
        run(function* () {
          return createRunReturnFailureLike('boom');
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must return a `Failable` or finish without returning a value.'
        );
        return;
      }

      throw new Error(
        'Expected `run(...)` to reject failure-like plain-object return values'
      );
    });

    it('rejects success-like plain-object return values from async builders at runtime', async () => {
      try {
        await run(async function* () {
          return createRunReturnSuccessLike(123);
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must return a `Failable` or finish without returning a value.'
        );
        return;
      }

      throw new Error(
        'Expected async `run(...)` to reject success-like plain-object return values'
      );
    });

    it('rejects failure-like plain-object return values from async builders at runtime', async () => {
      try {
        await run(async function* () {
          return createRunReturnFailureLike('boom');
        } as never);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          '`run()` generators must return a `Failable` or finish without returning a value.'
        );
        return;
      }

      throw new Error(
        'Expected async `run(...)` to reject failure-like plain-object return values'
      );
    });
  });
});

describe('failable()', () => {
  describe('Failable input', () => {
    describe('Success input', () => {
      it('returns Success inputs as-is', () => {
        const original = success(faker.number.float());

        expect(failable(original)).toBe(original);
      });

      it('leaves Success inputs unchanged when normalization is enabled', () => {
        const original = success(faker.number.float());

        expect(failable(original, NormalizedErrors)).toBe(original);
      });
    });

    describe('Failure input', () => {
      it('returns Failure inputs as-is', () => {
        const original = failure(faker.string.uuid());

        expect(failable(original)).toBe(original);
      });

      it('passes through existing Error failures unchanged with NormalizedErrors', () => {
        const original = failure(new Error(faker.string.uuid()));
        const result = failable(original, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result).toBe(original);
      });

      it('uses a custom normalizeError function for existing Error failures', () => {
        const originalError = new Error(faker.string.uuid());
        const normalizedError = new Error('normalized', {
          cause: originalError,
        });
        const normalizeError = vi.fn(() => normalizedError);
        const original = failure(originalError);
        const result = failable(original, { normalizeError });

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(normalizeError).toHaveBeenCalledTimes(1);
        expect(normalizeError).toHaveBeenCalledWith(originalError);
        expect(result).not.toBe(original);
        expect(result.error).toBe(normalizedError);
      });

      it('returns a new Failure instance when normalization changes the error', () => {
        const original = failure(faker.string.uuid());
        const result = failable(original, NormalizedErrors);

        ensureFailure(result);
        expect(result).not.toBe(original);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: original.error });
      });

      it('serializes plain-object Failure inputs with NormalizedErrors', () => {
        const error = { code: 'bad_request' } as const;
        const result = failable(failure(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe(JSON.stringify(error));
        expect(result.error).toMatchObject({ cause: error });
      });

      it('serializes null-prototype Failure inputs with NormalizedErrors', () => {
        const error = createNullPrototypeObject({
          code: 'bad_request' as const,
        });
        const result = failable(failure(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe(
          JSON.stringify({ code: 'bad_request' })
        );
        expect(result.error).toMatchObject({ cause: error });
      });

      it('falls back to the current stringification path when plain-object serialization fails', () => {
        const error = {} as { self?: unknown };
        error.self = error;
        const result = failable(failure(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe(String(error));
        expect(result.error).toMatchObject({ cause: error });
      });

      it('uses the stable fallback message when plain-object normalization cannot stringify safely', () => {
        const error = createPlainObjectWithoutSafeErrorMessage();

        const result = failable(failure(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('Unstringifiable error value');
        expect(result.error).toMatchObject({ cause: error });
      });

      it('converts array failures to AggregateError', () => {
        const error = [faker.string.uuid(), faker.string.uuid()];
        const result = failable(failure(error), NormalizedErrors);

        ensureFailure(result);
        expect(result.error).toBeInstanceOf(AggregateError);
        expect(result.error).toMatchObject({ cause: error });
      });
    });
  });

  describe('FailableLike input', () => {
    describe('Success shape', () => {
      it('rehydrates FailableLikeSuccess inputs', () => {
        const data = faker.number.float();
        const input = {
          status: FailableStatus.Success,
          data,
        } as const satisfies FailableLikeSuccess<typeof data>;

        expect(failable(input)).toStrictEqual(success(data));
      });

      it('round-trips FailableLikeSuccess inputs with undefined data', () => {
        const input = toFailableLike(success(undefined));

        expect(isFailableLike(input)).toBe(true);
        expect(failable(input)).toStrictEqual(success(undefined));
      });

      it('rehydrates FailableLike<T, E> union inputs when they hold success data', () => {
        type DataType = 123;
        type ErrorType = 'boom';

        const input = {
          status: FailableStatus.Success,
          data: 123 as DataType,
        } as FailableLike<DataType, ErrorType>;
        const result = failable(input);

        expect(result).toStrictEqual(success(123 as DataType));
        expectTypeOf(result).toEqualTypeOf<Failable<DataType, ErrorType>>();
      });
    });

    describe('Failure shape', () => {
      it('rehydrates FailableLikeFailure inputs', () => {
        const error = faker.string.uuid();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;

        expect(failable(input)).toStrictEqual(failure(error));
      });

      it('round-trips FailableLikeFailure inputs with undefined error', () => {
        const input = toFailableLike(failure(undefined));

        expect(isFailableLike(input)).toBe(true);
        expect(failable(input)).toStrictEqual(failure(undefined));
      });

      it('rehydrates FailableLike<T, E> union inputs when they hold failure errors', () => {
        type DataType = 123;
        type ErrorType = 'boom';

        const input = {
          status: FailableStatus.Failure,
          error: 'boom' as ErrorType,
        } as FailableLike<DataType, ErrorType>;
        const result = failable(input);

        expect(result).toStrictEqual(failure('boom' as ErrorType));
        expectTypeOf(result).toEqualTypeOf<Failable<DataType, ErrorType>>();
      });

      it('normalizes FailableLikeFailure inputs with NormalizedErrors', () => {
        const error = faker.number.int();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;
        const result = failable(input, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: error });
      });
    });
  });

  describe('function input', () => {
    describe('Success result', () => {
      it('preserves Success values returned from functions', () => {
        const original = success(faker.number.float());

        expect(failable(() => original)).toBe(original);
      });

      it('rehydrates FailableLikeSuccess values returned from functions', () => {
        const data = faker.number.float();
        const input = {
          status: FailableStatus.Success,
          data,
        } as const satisfies FailableLikeSuccess<typeof data>;

        expect(failable(() => input)).toStrictEqual(success(data));
      });

      it('wraps plain function return values in Success', () => {
        const value = faker.number.float();

        expect(failable(() => value)).toStrictEqual(success(value));
      });

      it('treats plain success lookalikes returned from functions as plain data', () => {
        const lookalike = createSuccessLookalike(faker.number.float());
        const result = failable(() => lookalike);

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });

      it('treats plain failure lookalikes returned from functions as plain data', () => {
        const lookalike = createFailureLookalike(faker.string.uuid());
        const result = failable(() => lookalike);

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });

      it('returns Failure<Error> when an async function is passed by any-cast', () => {
        const value = faker.number.float();
        const result = failable((async () => value) as unknown as () => number);

        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        const error = result.error as Error;
        expect(error.message).toBe(
          '`failable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await failable(promise)`.'
        );
      });

      it('returns Failure<Error> when a callback returns a promise by any-cast', () => {
        const value = faker.number.float();
        const result = failable(
          (() => Promise.resolve(value)) as unknown as () => number
        );

        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        const error = result.error as Error;
        expect(error.message).toBe(
          '`failable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await failable(promise)`.'
        );
      });

      it('consumes rejected promise-returning callback misuse so it does not leak an unhandled rejection', async () => {
        const rejection = { code: faker.string.uuid() };
        let sawUnhandledRejection = false;
        const onUnhandledRejection = (reason: unknown) => {
          if (reason === rejection) sawUnhandledRejection = true;
        };

        process.on('unhandledRejection', onUnhandledRejection);

        try {
          const result = failable(
            (() => Promise.reject(rejection)) as unknown as () => number
          );

          ensureFailure(result);
          expect(result.error).toBeInstanceOf(Error);
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect(sawUnhandledRejection).toBe(false);
        } finally {
          process.off('unhandledRejection', onUnhandledRejection);
        }
      });

      it('preserves the actionable guard error even when custom normalization is enabled', () => {
        const normalizeError = vi.fn(
          (error: unknown) => new Error('normalized', { cause: error })
        );
        const result = failable(
          (() => Promise.resolve(faker.number.float())) as unknown as () => number,
          { normalizeError }
        );

        ensureFailure(result);
        expect(normalizeError).not.toHaveBeenCalled();
        expect(result.error.message).toBe(
          '`failable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await failable(promise)`.'
        );
      });
    });

    describe('Failure result', () => {
      it('preserves Failure values returned from functions', () => {
        const original = failure(new Error(faker.string.uuid()));

        expect(failable(() => original)).toBe(original);
      });

      it('normalizes existing Failure values returned from functions when normalization is enabled', () => {
        const original = failure(faker.string.uuid());
        const result = failable(() => original, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result).not.toBe(original);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: original.error });
      });

      it('rehydrates FailableLikeFailure values returned from functions', () => {
        const error = faker.string.uuid();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;

        expect(failable(() => input)).toStrictEqual(failure(error));
      });

      it('normalizes FailableLikeFailure values returned from functions when normalization is enabled', () => {
        const error = faker.number.int();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;
        const result = failable(() => input, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: error });
      });

      it('captures thrown values as Failure', () => {
        const error = new Error(faker.string.uuid());
        const result = failable(() => {
          throw error;
        });

        ensureFailure(result);
        expect(result.error).toBe(error);
      });

      it.each(RAW_ERROR_CASES)(
        'preserves raw thrown non-Error values ($label)',
        ({ error }) => {
          const result = failable(() => {
            throw error;
          });

          ensureFailure(result);
          expect(result.error).toBe(error);
        }
      );

      it('serializes thrown plain objects with NormalizedErrors', () => {
        const error = { code: 'bad_request' } as const;
        const result = failable(() => {
          throw error;
        }, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe(JSON.stringify(error));
        expect(result.error).toMatchObject({ cause: error });
      });

      it('captures unstringifiable thrown values with a stable Error message', () => {
        const error = createUnstringifiableErrorValue();
        const result = failable(() => {
          throw error;
        }, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('Unstringifiable error value');
        expect(result.error).toMatchObject({ cause: error });
      });

      it('uses a custom normalizeError function when provided', () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const result = failable(
          () => {
            throw error;
          },
          {
            normalizeError(rawError) {
              return new Error('normalized', { cause: rawError });
            },
          }
        );

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({
          cause: error,
          message: 'normalized',
        });
      });
    });

    describe('type inference', () => {
      it('defaults function wrapper failures to unknown', () => {
        const result = failable(() => 123);

        expectTypeOf(result).toEqualTypeOf<Failable<123, unknown>>();
      });
    });
  });

  describe('promise input', () => {
    describe('Success result', () => {
      it('wraps resolved thenable values in Success', async () => {
        const value = faker.number.float();

        await expect(
          failable(createResolvingThenable(value))
        ).resolves.toStrictEqual(success(value));
      });

      it('preserves Success values resolved from promises', async () => {
        const original = success(faker.number.float());

        await expect(failable(Promise.resolve(original))).resolves.toBe(
          original
        );
      });

      it('preserves Success values resolved from thenables', async () => {
        const original = success(faker.number.float());
        const result = failable(createResolvingThenable(original));

        expectTypeOf(result).toEqualTypeOf<Promise<Success<number>>>();
        await expect(result).resolves.toBe(original);
      });

      it('rehydrates FailableLikeSuccess values resolved from promises', async () => {
        const data = faker.number.float();
        const input = {
          status: FailableStatus.Success,
          data,
        } as const satisfies FailableLikeSuccess<typeof data>;

        await expect(failable(Promise.resolve(input))).resolves.toStrictEqual(
          success(data)
        );
      });

      it('rehydrates FailableLikeSuccess values resolved from thenables', async () => {
        const data = faker.number.float();
        const input = {
          status: FailableStatus.Success,
          data,
        } as const satisfies FailableLikeSuccess<typeof data>;
        const result = failable(createResolvingThenable(input));

        expectTypeOf(result).toEqualTypeOf<Promise<Success<number>>>();
        await expect(result).resolves.toStrictEqual(success(data));
      });

      it('wraps resolved promise values in Success', async () => {
        const value = faker.number.float();

        await expect(failable(Promise.resolve(value))).resolves.toStrictEqual(
          success(value)
        );
      });

      it('treats plain success lookalikes resolved from promises as plain data', async () => {
        const lookalike = createSuccessLookalike(faker.number.float());
        const result = await failable(Promise.resolve(lookalike));

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });

      it('treats plain failure lookalikes resolved from promises as plain data', async () => {
        const lookalike = createFailureLookalike(faker.string.uuid());
        const result = await failable(Promise.resolve(lookalike));

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });
    });

    describe('Failure result', () => {
      it('captures rejected thenable values as Failure', async () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const result = await failable(createRejectingThenable<number>(error));

        ensureFailure(result);
        expect(result.error).toBe(error);
      });

      it('preserves Failure values resolved from promises', async () => {
        const original = failure(new Error(faker.string.uuid()));

        await expect(failable(Promise.resolve(original))).resolves.toBe(
          original
        );
      });

      it('normalizes existing Failure values resolved from promises when normalization is enabled', async () => {
        const original = failure(faker.string.uuid());
        const result = failable(Promise.resolve(original), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved).not.toBe(original);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error).toMatchObject({ cause: original.error });
      });

      it('rehydrates FailableLikeFailure values resolved from promises', async () => {
        const error = faker.string.uuid();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;

        await expect(failable(Promise.resolve(input))).resolves.toStrictEqual(
          failure(error)
        );
      });

      it('normalizes FailableLikeFailure values resolved from promises when normalization is enabled', async () => {
        const error = faker.number.int();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;
        const result = failable(Promise.resolve(input), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('captures rejected values as Failure', async () => {
        const error = new Error(faker.string.uuid());
        const result = await failable(Promise.reject(error));

        ensureFailure(result);
        expect(result.error).toBe(error);
      });

      it.each(RAW_ERROR_CASES)(
        'preserves raw rejected non-Error values ($label)',
        async ({ error }) => {
          const result = await failable(Promise.reject(error));

          ensureFailure(result);
          expect(result.error).toBe(error);
        }
      );

      it('serializes rejected plain objects with NormalizedErrors', async () => {
        const error = { code: 'bad_request' } as const;
        const result = failable(Promise.reject(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error.message).toBe(JSON.stringify(error));
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('keeps rejected null-prototype plain objects in the failure channel with NormalizedErrors', async () => {
        const error = createNullPrototypeObject({
          code: 'bad_request' as const,
        });
        const result = failable(Promise.reject(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error.message).toBe(
          JSON.stringify({ code: 'bad_request' })
        );
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('captures unstringifiable rejected values with a stable Error message', async () => {
        const error = createUnstringifiableErrorValue();
        const result = failable(Promise.reject(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error.message).toBe('Unstringifiable error value');
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('serializes rejected plain-object thenables with NormalizedErrors', async () => {
        const error = { code: 'bad_request' } as const;
        const result = failable(
          createRejectingThenable<number>(error),
          NormalizedErrors
        );

        expectTypeOf(result).toEqualTypeOf<Promise<Failable<number, Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error.message).toBe(JSON.stringify(error));
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('uses a custom normalizeError function when provided', async () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const result = failable(Promise.reject(error), {
          normalizeError(rawError) {
            return new Error('normalized', { cause: rawError });
          },
        });

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error).toMatchObject({
          cause: error,
          message: 'normalized',
        });
      });

      it('uses a custom normalizeError function for rejected thenables', async () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const normalizeError = vi.fn(
          (rawError: unknown) => new Error('normalized', { cause: rawError })
        );
        const result = failable(createRejectingThenable<number>(error), {
          normalizeError,
        });

        expectTypeOf(result).toEqualTypeOf<Promise<Failable<number, Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(normalizeError).toHaveBeenCalledTimes(1);
        expect(normalizeError).toHaveBeenCalledWith(error);
        expect(resolved.error).toMatchObject({
          cause: error,
          message: 'normalized',
        });
      });
    });

    describe('type inference', () => {
      it('defaults promise wrapper failures to unknown', () => {
        const result = failable(Promise.resolve(123));

        expectTypeOf(result).toEqualTypeOf<Promise<Failable<123, unknown>>>();
      });

      it('infers Promise<FailableLike<T, E>> as Promise<Failable<T, E>>', async () => {
        type DataType = 123;
        type ErrorType = 'boom';

        const input: FailableLike<DataType, ErrorType> =
          faker.helpers.arrayElement([
            { status: FailableStatus.Success, data: 123 as DataType },
            { status: FailableStatus.Failure, error: 'boom' as ErrorType },
          ]);
        const result = failable(Promise.resolve(input));

        expectTypeOf(result).toEqualTypeOf<
          Promise<Failable<DataType, ErrorType>>
        >();
        expect(isFailable(await result)).toBe(true);
      });
    });
  });
});

describe('E2E', () => {
  it('manual managing and async run() are equivalent', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.endsWith('/profile')) {
        return new Response(
          JSON.stringify({
            id: '10',
            name: 'Ada Lovelace',
            pictureUrl: 'https://example.com/ada.png',
          })
        );
      }

      return new Response(
        JSON.stringify({
          id: '10',
          email: 'ada@example.com',
        })
      );
    });
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      async function getUser(userId: string) {
        const fetchResult = await failable(
          fetch(`https://api.example.com/users/${userId}`)
        );

        if (fetchResult.isFailure) {
          return failure({
            reason: 'network_error',
            cause: fetchResult.error,
          } as const);
        }

        if (!fetchResult.data.ok) {
          return failure({
            reason: 'http_error',
            cause: fetchResult.data,
          } as const);
        }

        const parseJsonResult = await failable(fetchResult.data.json());

        if (parseJsonResult.isFailure) {
          return failure({
            reason: 'json_parse_error',
            cause: parseJsonResult.error,
          } as const);
        }

        return success(parseJsonResult.data as { id: string; email: string });
      }

      async function getUserProfile(userId: string) {
        const fetchResult = await failable(
          fetch(`https://api.example.com/users/${userId}/profile`)
        );

        if (fetchResult.isFailure) {
          return failure({
            reason: 'network_error',
            cause: fetchResult.error,
          } as const);
        }

        if (!fetchResult.data.ok) {
          return failure({
            reason: 'http_error',
            cause: fetchResult.data,
          } as const);
        }

        const parseJsonResult = await failable(fetchResult.data.json());

        if (parseJsonResult.isFailure) {
          return failure({
            reason: 'json_parse_error',
            cause: parseJsonResult.error,
          } as const);
        }

        return success(
          parseJsonResult.data as {
            id: string;
            name: string;
            pictureUrl: string;
          }
        );
      }

      const getUserId = (): Failable<string, 'missing-user-id'> =>
        success('10');

      async function withoutRun() {
        const getUserIdResult = getUserId();

        if (getUserIdResult.isFailure) {
          return getUserIdResult;
        }

        const userId = getUserIdResult.data;

        const [getUserResult, getProfileResult] = await Promise.all([
          getUser(userId),
          getUserProfile(userId),
        ]);

        if (getUserResult.isFailure) {
          return getUserResult;
        }

        if (getProfileResult.isFailure) {
          return getProfileResult;
        }

        return success({
          user: getUserResult.data,
          profile: getProfileResult.data,
        });
      }

      async function withRun() {
        return run(async function* () {
          const userId = yield* getUserId();
          const [userResult, profileResult] = await Promise.all([
            getUser(userId),
            getUserProfile(userId),
          ]);
          const user = yield* userResult;
          const profile = yield* profileResult;
          return success({ user, profile });
        });
      }

      async function withRunAll() {
        return run(async function* () {
          const userId = yield* getUserId();
          const [user, profile] = yield* await all(
            getUser(userId),
            getUserProfile(userId)
          );
          return success({ user, profile });
        });
      }

      const result1 = await withoutRun();
      const result2 = await withRun();
      const result3 = await withRunAll();

      expect(result1).toStrictEqual(result2);
      expect(result1).toStrictEqual(result3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
