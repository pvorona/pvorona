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

describe('public surface', () => {
  it('supports the README quick-start example', () => {
    const okResult = divide(10, 2);
    const errorResult = divide(10, 0);

    if (isFailure(okResult)) {
      throw new Error('Expected divide(10, 2) to succeed');
    }

    expect(okResult.data).toBe(5);

    if (!isFailure(errorResult)) {
      throw new Error('Expected divide(10, 0) to fail');
    }

    expect(errorResult.error).toBe('Cannot divide by zero');
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

  it('supports the README normalized-errors example', () => {
    const result = createFailable(
      () => {
        throw { code: 'bad_request' };
      },
      NormalizedErrors,
    );

    if (!isFailure(result)) {
      throw new Error('Expected normalized createFailable result to fail');
    }

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.cause).toEqual({ code: 'bad_request' });
  });

  it('supports the README `run(...)` example', () => {
    const result = run(function* ({ get }) {
      const first = yield* get(divide(20, 2));
      const second = yield* get(divide(first, 5));

      return success(second);
    });

    if (isFailure(result)) {
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

    if (isFailure(result)) {
      throw new Error('Expected the async `run(...)` example to succeed');
    }

    expect(result.data).toBe(2);
  });

  it('supports the README structured-clone transport example', () => {
    const wire = toFailableLike(success(123));

    expect(wire).toStrictEqual({
      status: FailableStatus.Success,
      data: 123,
    });
    expect(isFailableLike(wire)).toBe(true);

    const hydrated = createFailable(wire);

    if (isFailure(hydrated)) {
      throw new Error('Expected structured-clone rehydration to succeed');
    }

    expect(hydrated.data).toBe(123);
  });
});
