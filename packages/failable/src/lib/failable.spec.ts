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
  success,
  toFailableLike,
  type Failable,
  type FailableLike,
  type FailableLikeFailure,
  type FailableLikeSuccess,
  type Failure,
  type Success,
} from './failable.js';

describe('success', () => {
  it('creates a frozen Success instance with correct properties', () => {
    const value = faker.number.float();
    const result = success(value);
    expect(isFailable(result)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
    expect(result.isSuccess).toBe(true);
    expect(result.isError).toBe(false);
    expect(result.status).toBe(FailableStatus.Success);
    expect(result.data).toBe(value);
    expect(result.error).toBeNull();
    expect(result.getOrThrow()).toBe(value);
  });
});

describe('failure', () => {
  it('creates a frozen Failure instance with correct properties', () => {
    const message = faker.string.uuid();
    const error = new Error(message);
    const result = failure(error);
    expect(isFailable(result)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(isSuccess(result)).toBe(false);
    expect(isFailure(result)).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.isError).toBe(true);
    expect(result.status).toBe(FailableStatus.Failure);
    expect(result.data).toBeNull();
    expect(result.error).toBe(error);
    expect(() => result.getOrThrow()).toThrow(error);
  });
});

describe('toFailableLike', () => {
  it('converts Success to FailableLikeSuccess', () => {
    const value = faker.number.float();
    const result = toFailableLike(success(value));
    expect(result).toStrictEqual({
      status: FailableStatus.Success,
      data: value,
    });
    expectTypeOf(result).toEqualTypeOf<FailableLikeSuccess<typeof value>>();
  });

  it('converts Failure to FailableLikeFailure', () => {
    const message = faker.string.uuid();
    const error = new Error(message);
    const result = toFailableLike(failure(error));
    expect(result).toStrictEqual({ status: FailableStatus.Failure, error });
    expectTypeOf(result).toEqualTypeOf<FailableLikeFailure<typeof error>>();
  });

  it('converts Failable to FailableLike', () => {
    const data = faker.number.float();
    const error = faker.string.uuid();
    const successResult = success(data) as Failable<typeof data, unknown>;
    const failureResult = failure(error) as Failable<unknown, typeof error>;

    const result1 = toFailableLike(successResult);
    expect(result1).toStrictEqual({
      status: successResult.status,
      data: successResult.data,
    });
    expectTypeOf(result1).toEqualTypeOf<FailableLike<typeof data, unknown>>();

    const result2 = toFailableLike(failureResult);
    expect(result2).toStrictEqual({
      status: failureResult.status,
      error: failureResult.error,
    });
    expectTypeOf(result2).toEqualTypeOf<FailableLike<unknown, typeof error>>();
  });
});

describe('isFailableLike', () => {
  it('returns true for { status: success, data }', () => {
    const value = faker.number.float();
    const result = isFailableLike({
      status: FailableStatus.Success,
      data: value,
    });
    expect(result).toBe(true);
  });

  it('returns true for { status: failure, error }', () => {
    const message = faker.string.uuid();
    const error = new Error(message);
    const result = isFailableLike({
      status: FailableStatus.Failure,
      error,
    });
    expect(result).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['boolean', faker.helpers.arrayElement([true, false])],
    ['number', faker.number.float()],
    ['string', faker.string.uuid()],
    ['bigint', BigInt(faker.number.int({ min: 0, max: 10_000 }))],
    ['symbol', Symbol(faker.string.uuid())],
    ['function', () => faker.string.uuid()],
    ['array', [faker.string.uuid()]],
    ['object', { foo: faker.string.uuid() }],
  ])('returns false for %s', (_, value) => {
    const result = isFailableLike(value);
    expect(result).toBe(false);
  });

  it('returns false for unknown status', () => {
    const result = isFailableLike({ status: 'wat', data: 123 });
    expect(result).toBe(false);
  });

  it('returns false for success without data', () => {
    const result = isFailableLike({
      status: FailableStatus.Success,
    });
    expect(result).toBe(false);
  });

  it('returns false for failure without error', () => {
    const result = isFailableLike({
      status: FailableStatus.Failure,
    });
    expect(result).toBe(false);
  });

  it('returns false for FailableLikeSuccess with extra properties', () => {
    const result = isFailableLike({
      status: FailableStatus.Success,
      data: faker.number.float(),
      extra: faker.string.uuid(),
    });
    expect(result).toBe(false);
  });

  it('returns false for FailableLikeFailure with extra properties', () => {
    const result = isFailableLike({
      status: FailableStatus.Failure,
      error: faker.string.uuid(),
      extra: faker.string.uuid(),
    });
    expect(result).toBe(false);
  });
});

describe('createFailable (failableLike)', () => {
  it('rehydrates FailableLikeSuccess into Success', () => {
    const data = faker.number.float();
    const failableLike = {
      status: FailableStatus.Success,
      data,
    } as const satisfies FailableLikeSuccess<typeof data>;
    const result = createFailable(failableLike);
    expect(result).toStrictEqual(success(data));
    expectTypeOf(result).toEqualTypeOf<Success<typeof data>>();
  });

  it('rehydrates FailableLikeFailure into Failure', () => {
    const error = faker.string.uuid();
    const failableLike = {
      status: FailableStatus.Failure,
      error,
    } as const satisfies FailableLikeFailure<typeof error>;
    const result = createFailable(failableLike);
    expect(result).toStrictEqual(failure(error));
    expectTypeOf(result).toEqualTypeOf<Failure<typeof error>>();
  });

  it('rehydrates FailableLike into Failable', () => {
    const data = faker.number.float();
    const error = faker.string.uuid();
    const success = {
      status: FailableStatus.Success,
      data,
    } as FailableLike<typeof data, unknown>;
    const failure = {
      status: FailableStatus.Failure,
      error,
    } as FailableLike<unknown, typeof error>;

    const result1 = createFailable(success);
    expect(result1).toStrictEqual(success(data));
    expectTypeOf(result1).toEqualTypeOf<Failable<typeof data, unknown>>();

    const result2 = createFailable(failure);
    expect(result2).toStrictEqual(failure(error));
    expectTypeOf(result2).toEqualTypeOf<Failable<unknown, typeof error>>();
  });
});

describe('or', () => {
  it('Success keeps original', () => {
    type ValueType = 123;
    const value: ValueType = 123;
    const original = success(value);
    const result = original.or('fallback');
    expect(result).toBe(original);
    expect(result).toStrictEqual(success(value));
    expectTypeOf(result).toEqualTypeOf<Success<ValueType>>();
  });

  it('Failure recovers to Success', () => {
    type FallbackType = string;
    const error = new Error(faker.string.uuid());
    const original = failure(error);
    const fallback: FallbackType = faker.string.uuid();
    const result = original.or(fallback);
    expect(result).toStrictEqual(success(fallback));
    expectTypeOf(result).toEqualTypeOf<Success<FallbackType>>();
  });
});

describe('getOr', () => {
  it('Success returns its data', () => {
    type ValueType = 123;
    const value: ValueType = 123;
    const original = success(value);
    const result = original.getOr('fallback');
    expect(result).toBe(value);
    expectTypeOf(result).toEqualTypeOf<ValueType>();
  });

  it('Failure returns fallback', () => {
    type FallbackType = 456;
    const message = faker.string.uuid();
    const error = new Error(message);
    const original = failure(error);
    const fallback: FallbackType = 456;
    const result = original.getOr(fallback);
    expect(result).toBe(fallback);
    expectTypeOf(result).toEqualTypeOf<FallbackType>();
  });
});

describe('type ergonomics (Failable union)', () => {
  it('infers correct types for or, getOr, getOrThrow', () => {
    const union: Failable<number, string> = faker.helpers.arrayElement([
      success(123),
      failure('boom'),
    ]);

    const orResult = union.or({ a: 1 });
    expectTypeOf(orResult).toEqualTypeOf<
      Success<number> | Success<{ a: number }>
    >();

    const getOrResult = union.getOr({ b: 'b' });
    expectTypeOf(getOrResult).toEqualTypeOf<number | { b: string }>();

    expectTypeOf<ReturnType<typeof union.getOrThrow>>().toEqualTypeOf<
      number | never
    >();
  });
});

describe('createFailable (function)', () => {
  it('wraps success', () => {
    const value = faker.number.float();
    const result = createFailable(() => value);
    expect(isSuccess(result)).toBe(true);
    expect(result.data).toBe(value);
  });

  it('wraps error', () => {
    const value = faker.number.float();
    const result = createFailable(() => {
      throw value;
    });
    expect(isFailure(result)).toBe(true);
    expect(result.error).toBe(value);
  });

  it('rehydrates FailableLikeSuccess return value', () => {
    const data = faker.number.float();
    const failableLike = {
      status: FailableStatus.Success,
      data,
    } as const satisfies FailableLikeSuccess<typeof data>;
    const result = createFailable(() => failableLike);
    expect(result).toStrictEqual(success(data));
  });

  it('rehydrates FailableLikeFailure return value', () => {
    const error = faker.string.uuid();
    const failableLike = {
      status: FailableStatus.Failure,
      error,
    } as const satisfies FailableLikeFailure<typeof error>;
    const result = createFailable(() => failableLike);
    expect(result).toStrictEqual(failure(error));
  });

  it("doesn't wrap Success", () => {
    const value = faker.number.float();
    const original = success(value);
    const result = createFailable(() => original);
    expect(result).toBe(original);
  });

  it("doesn't wrap Failure", () => {
    const message = faker.string.uuid();
    const error = new Error(message);
    const original = failure(error);
    const result = createFailable(() => original);
    expect(result).toBe(original);
  });
});

describe('createFailable (promise)', () => {
  it('wraps success', async () => {
    const value = faker.number.float();
    const result = await createFailable(Promise.resolve(value));
    expect(isSuccess(result)).toBe(true);
    expect(result.data).toBe(value);
  });

  it('wraps error', async () => {
    const value = faker.number.float();
    const result = await createFailable(Promise.reject(value));
    expect(isFailure(result)).toBe(true);
    expect(result.error).toBe(value);
  });

  it('rehydrates FailableLikeSuccess resolved value', async () => {
    const data = faker.number.float();
    const failableLike = {
      status: FailableStatus.Success,
      data,
    } as const satisfies FailableLikeSuccess<typeof data>;
    const result = await createFailable(Promise.resolve(failableLike));
    expect(result).toStrictEqual(success(data));
  });

  it('rehydrates FailableLikeFailure resolved value', async () => {
    const error = faker.string.uuid();
    const failableLike = {
      status: FailableStatus.Failure,
      error,
    } as const satisfies FailableLikeFailure<typeof error>;
    const result = await createFailable(Promise.resolve(failableLike));
    expect(result).toStrictEqual(failure(error));
  });

  it("doesn't wrap Success", async () => {
    const value = faker.number.float();
    const original = success(value);
    const result = await createFailable(Promise.resolve(original));
    expect(result).toBe(original);
  });

  it("doesn't wrap Failure", async () => {
    const value = faker.number.float();
    const original = failure(value);
    const result = await createFailable(Promise.resolve(original));
    expect(result).toBe(original);
  });

  it('infers Promise<FailableLike<T, E>> as Promise<Failable<T, E>>', async () => {
    const data = faker.number.float();
    const error = faker.string.uuid();
    const failableLike: FailableLike<typeof data, typeof error> =
      faker.helpers.arrayElement([
        { status: FailableStatus.Success, data },
        { status: FailableStatus.Failure, error },
      ]);

    const result = createFailable(Promise.resolve(failableLike));
    expectTypeOf(result).toEqualTypeOf<
      Promise<Failable<typeof data, typeof error>>
    >();

    expect(isFailable(await result)).toBe(true);
  });
});
