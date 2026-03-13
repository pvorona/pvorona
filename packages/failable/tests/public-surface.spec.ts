import {
  createFailable,
  failure,
  FailableStatus,
  isFailure,
  isFailableLike,
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
