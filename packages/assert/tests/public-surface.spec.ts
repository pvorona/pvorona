import {
  assert,
  AssertionError,
  ensureNotNullOrUndefined,
  hasOwnPropertyValue,
  isString,
  type AssertionFailure,
} from '@pvorona/assert';

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
        (<T>() => T extends Left ? 1 : 2)
      ? true
      : false
    : false;

function expectType<Condition extends true>(condition: Condition): void {
  void condition;
}

type ConsumerModule = typeof import('@pvorona/assert');
expectType<
  Equal<'ensureNonEmptyArray' extends keyof ConsumerModule ? true : false, false>
>(true);

describe('public surface', () => {
  it('throws `AssertionError` and supports an `AssertionFailure` callback', () => {
    const failure: AssertionFailure = () => 'Invalid port';

    expect(() => assert(false, failure)).toThrow(AssertionError);
    expect(() => assert(false, failure)).toThrow('Invalid port');
  });

  it('removes null and undefined with ensureNotNullOrUndefined', () => {
    const envPort = '3000' as null | string | undefined;
    const port = ensureNotNullOrUndefined(envPort);

    expect(port).toBe('3000');
  });

  it('checks an object property on unknown values', () => {
    const result: unknown = { status: 'success', value: 42 };

    expect(hasOwnPropertyValue(result, 'status', 'success')).toBe(true);
  });

  it('narrows an existing union with isString', () => {
    function format(value: string | number): string {
      if (!isString(value)) return String(value);

      return value.toUpperCase();
    }

    expect(format('port')).toBe('PORT');
    expect(format(42)).toBe('42');
  });
});
