import { faker } from '@faker-js/faker';
import { expectTypeOf } from 'expect-type';
import {
  createFailable,
  failure,
  FailableStatus,
  isFailable,
  isFailableLike,
  isFailure,
  isSuccess,
  NormalizedErrors,
  success,
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
    isError: false as const,
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
    isError: true as const,
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

function createUnionFailable<T, E>(data: T, error: E): Failable<T, E> {
  return faker.helpers.arrayElement([success(data), failure(error)]) as Failable<
    T,
    E
  >;
}

describe('success()', () => {
  const value = 123 as const;
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

  it('isError = false', () => {
    expect(result.isError).toBe(false);
  });

  it('data = T', () => {
    expect(result.data).toBe(value);
  });

  it('error = null', () => {
    expect(result.error).toBeNull();
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

  it('isError = true', () => {
    expect(result.isError).toBe(true);
  });

  it('error = E', () => {
    expect(result.error).toBe(error);
  });

  it('data = null', () => {
    expect(result.data).toBeNull();
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
      const value = 123 as const;
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

      expect(failure(new Error(faker.string.uuid())).or(fallback)).toStrictEqual(
        success(fallback)
      );
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
      const value = 123 as const;

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
      const fallback = 'fallback' as const;

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
      const value = 123 as const;

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
      const fallback = 'fallback' as const;

      expect(
        failure(new Error(faker.string.uuid())).getOrElse(() => fallback)
      ).toBe(fallback);
    });

    it('invokes the fallback callback once', () => {
      const getFallback = vi.fn(() => faker.string.uuid());

      failure(new Error(faker.string.uuid())).getOrElse(getFallback);

      expect(getFallback).toHaveBeenCalledTimes(1);
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
      const value = 123 as const;

      expect(success(value).getOrThrow()).toBe(value);
    });

    it('returns the success data type', () => {
      type ValueType = 123;

      const result = success(123 as ValueType).getOrThrow();

      expectTypeOf(result).toEqualTypeOf<ValueType>();
    });
  });

  describe('Failure receiver', () => {
    it('throws the stored error', () => {
      const error = new Error(faker.string.uuid());

      expect(() => failure(error).getOrThrow()).toThrow(error);
    });

    it('returns never for failure types', () => {
      const result = failure('boom' as const);

      expect(isFailure(result)).toBe(true);
      expectTypeOf<ReturnType<typeof result.getOrThrow>>().toEqualTypeOf<
        never
      >();
    });
  });

  describe('Failable receiver', () => {
    it('infers the success data type', () => {
      type ValueType = 123;
      type ErrorType = 'boom';

      const result = createUnionFailable(
        123 as ValueType,
        'boom' as ErrorType
      );

      expect(isFailable(result)).toBe(true);
      expectTypeOf<ReturnType<typeof result.getOrThrow>>().toEqualTypeOf<
        ValueType
      >();
    });
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
  });
});

describe('createFailable()', () => {
  describe('Failable input', () => {
    describe('Success input', () => {
      it('returns Success inputs as-is', () => {
        const original = success(faker.number.float());

        expect(createFailable(original)).toBe(original);
      });

      it('leaves Success inputs unchanged when normalization is enabled', () => {
        const original = success(faker.number.float());

        expect(createFailable(original, NormalizedErrors)).toBe(original);
      });
    });

    describe('Failure input', () => {
      it('returns Failure inputs as-is', () => {
        const original = failure(faker.string.uuid());

        expect(createFailable(original)).toBe(original);
      });

      it('passes through existing Error failures unchanged with NormalizedErrors', () => {
        const original = failure(new Error(faker.string.uuid()));
        const result = createFailable(original, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        expect(result).toBe(original);
      });

      it('returns a new Failure instance when normalization changes the error', () => {
        const original = failure(faker.string.uuid());
        const result = createFailable(original, NormalizedErrors);

        ensureFailure(result);
        expect(result).not.toBe(original);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: original.error });
      });

      it('converts array failures to AggregateError', () => {
        const error = [faker.string.uuid(), faker.string.uuid()];
        const result = createFailable(failure(error), NormalizedErrors);

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

        expect(createFailable(input)).toStrictEqual(success(data));
      });

      it('round-trips FailableLikeSuccess inputs with undefined data', () => {
        const input = toFailableLike(success(undefined));

        expect(isFailableLike(input)).toBe(true);
        expect(createFailable(input)).toStrictEqual(success(undefined));
      });

      it('rehydrates FailableLike<T, E> union inputs when they hold success data', () => {
        type DataType = 123;
        type ErrorType = 'boom';

        const input = {
          status: FailableStatus.Success,
          data: 123 as DataType,
        } as FailableLike<DataType, ErrorType>;
        const result = createFailable(input);

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

        expect(createFailable(input)).toStrictEqual(failure(error));
      });

      it('round-trips FailableLikeFailure inputs with undefined error', () => {
        const input = toFailableLike(failure(undefined));

        expect(isFailableLike(input)).toBe(true);
        expect(createFailable(input)).toStrictEqual(failure(undefined));
      });

      it('rehydrates FailableLike<T, E> union inputs when they hold failure errors', () => {
        type DataType = 123;
        type ErrorType = 'boom';

        const input = {
          status: FailableStatus.Failure,
          error: 'boom' as ErrorType,
        } as FailableLike<DataType, ErrorType>;
        const result = createFailable(input);

        expect(result).toStrictEqual(failure('boom' as ErrorType));
        expectTypeOf(result).toEqualTypeOf<Failable<DataType, ErrorType>>();
      });

      it('normalizes FailableLikeFailure inputs with NormalizedErrors', () => {
        const error = faker.number.int();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;
        const result = createFailable(input, NormalizedErrors);

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

        expect(createFailable(() => original)).toBe(original);
      });

      it('rehydrates FailableLikeSuccess values returned from functions', () => {
        const data = faker.number.float();
        const input = {
          status: FailableStatus.Success,
          data,
        } as const satisfies FailableLikeSuccess<typeof data>;

        expect(createFailable(() => input)).toStrictEqual(success(data));
      });

      it('wraps plain function return values in Success', () => {
        const value = faker.number.float();

        expect(createFailable(() => value)).toStrictEqual(success(value));
      });

      it('treats plain success lookalikes returned from functions as plain data', () => {
        const lookalike = createSuccessLookalike(faker.number.float());
        const result = createFailable(() => lookalike);

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });

      it('treats plain failure lookalikes returned from functions as plain data', () => {
        const lookalike = createFailureLookalike(faker.string.uuid());
        const result = createFailable(() => lookalike);

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });

      it('treats async function results as plain success values and does not await them', async () => {
        const value = faker.number.float();
        const result = createFailable(async () => value);

        ensureSuccess(result);
        expect(result.data).toBeInstanceOf(Promise);
        await expect(result.data).resolves.toBe(value);
      });
    });

    describe('Failure result', () => {
      it('preserves Failure values returned from functions', () => {
        const original = failure(new Error(faker.string.uuid()));

        expect(createFailable(() => original)).toBe(original);
      });

      it('normalizes existing Failure values returned from functions when normalization is enabled', () => {
        const original = failure(faker.string.uuid());
        const result = createFailable(() => original, NormalizedErrors);

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

        expect(createFailable(() => input)).toStrictEqual(failure(error));
      });

      it('normalizes FailableLikeFailure values returned from functions when normalization is enabled', () => {
        const error = faker.number.int();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;
        const result = createFailable(() => input, NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: error });
      });

      it('captures thrown values as Failure', () => {
        const error = new Error(faker.string.uuid());
        const result = createFailable(() => {
          throw error;
        });

        ensureFailure(result);
        expect(result.error).toBe(error);
      });

      it.each(RAW_ERROR_CASES)(
        'preserves raw thrown non-Error values ($label)',
        ({ error }) => {
          const result = createFailable(() => {
            throw error;
          });

          ensureFailure(result);
          expect(result.error).toBe(error);
        }
      );

      it('normalizes thrown non-Error values with NormalizedErrors', () => {
        const error = faker.string.uuid();
        const result = createFailable(
          () => {
            throw error;
          },
          NormalizedErrors
        );

        expectTypeOf(result).toEqualTypeOf<Failure<Error>>();
        ensureFailure(result);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error).toMatchObject({ cause: error });
      });

      it('uses a custom normalizeError function when provided', () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const result = createFailable(
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
        const result = createFailable(() => 123 as const);

        expectTypeOf(result).toEqualTypeOf<Failable<123, unknown>>();
      });
    });
  });

  describe('promise input', () => {
    describe('Success result', () => {
      it('preserves Success values resolved from promises', async () => {
        const original = success(faker.number.float());

        await expect(
          createFailable(Promise.resolve(original))
        ).resolves.toBe(original);
      });

      it('rehydrates FailableLikeSuccess values resolved from promises', async () => {
        const data = faker.number.float();
        const input = {
          status: FailableStatus.Success,
          data,
        } as const satisfies FailableLikeSuccess<typeof data>;

        await expect(createFailable(Promise.resolve(input))).resolves.toStrictEqual(
          success(data)
        );
      });

      it('wraps resolved promise values in Success', async () => {
        const value = faker.number.float();

        await expect(
          createFailable(Promise.resolve(value))
        ).resolves.toStrictEqual(success(value));
      });

      it('treats plain success lookalikes resolved from promises as plain data', async () => {
        const lookalike = createSuccessLookalike(faker.number.float());
        const result = await createFailable(Promise.resolve(lookalike));

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });

      it('treats plain failure lookalikes resolved from promises as plain data', async () => {
        const lookalike = createFailureLookalike(faker.string.uuid());
        const result = await createFailable(Promise.resolve(lookalike));

        ensureSuccess(result);
        expect(result.data).toBe(lookalike);
      });
    });

    describe('Failure result', () => {
      it('preserves Failure values resolved from promises', async () => {
        const original = failure(new Error(faker.string.uuid()));

        await expect(
          createFailable(Promise.resolve(original))
        ).resolves.toBe(original);
      });

      it('normalizes existing Failure values resolved from promises when normalization is enabled', async () => {
        const original = failure(faker.string.uuid());
        const result = createFailable(
          Promise.resolve(original),
          NormalizedErrors
        );

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

        await expect(createFailable(Promise.resolve(input))).resolves.toStrictEqual(
          failure(error)
        );
      });

      it('normalizes FailableLikeFailure values resolved from promises when normalization is enabled', async () => {
        const error = faker.number.int();
        const input = {
          status: FailableStatus.Failure,
          error,
        } as const satisfies FailableLikeFailure<typeof error>;
        const result = createFailable(Promise.resolve(input), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('captures rejected values as Failure', async () => {
        const error = new Error(faker.string.uuid());
        const result = await createFailable(Promise.reject(error));

        ensureFailure(result);
        expect(result.error).toBe(error);
      });

      it.each(RAW_ERROR_CASES)(
        'preserves raw rejected non-Error values ($label)',
        async ({ error }) => {
          const result = await createFailable(Promise.reject(error));

          ensureFailure(result);
          expect(result.error).toBe(error);
        }
      );

      it('normalizes rejected non-Error values with NormalizedErrors', async () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const result = createFailable(Promise.reject(error), NormalizedErrors);

        expectTypeOf(result).toEqualTypeOf<Promise<Failure<Error>>>();

        const resolved = await result;
        ensureFailure(resolved);
        expect(resolved.error).toBeInstanceOf(Error);
        expect(resolved.error).toMatchObject({ cause: error });
      });

      it('uses a custom normalizeError function when provided', async () => {
        const error = {
          code: faker.string.uuid(),
          retryable: faker.datatype.boolean(),
        };
        const result = createFailable(Promise.reject(error), {
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
    });

    describe('type inference', () => {
      it('defaults promise wrapper failures to unknown', () => {
        const result = createFailable(Promise.resolve(123 as const));

        expectTypeOf(result).toEqualTypeOf<Promise<Failable<123, unknown>>>();
      });

      it('infers Promise<FailableLike<T, E>> as Promise<Failable<T, E>>', async () => {
        type DataType = 123;
        type ErrorType = 'boom';

        const input: FailableLike<DataType, ErrorType> = faker.helpers.arrayElement(
          [
            { status: FailableStatus.Success, data: 123 as DataType },
            { status: FailableStatus.Failure, error: 'boom' as ErrorType },
          ]
        );
        const result = createFailable(Promise.resolve(input));

        expectTypeOf(result).toEqualTypeOf<
          Promise<Failable<DataType, ErrorType>>
        >();
        expect(isFailable(await result)).toBe(true);
      });
    });
  });
});
