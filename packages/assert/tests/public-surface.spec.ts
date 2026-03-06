import {
  assert,
  AssertionError,
  ensureNotNullOrUndefined,
  hasOwnPropertyValue,
  isString,
} from '@pvorona/assert';

describe('public surface', () => {
  it('throws `AssertionError` and supports a lazy message', () => {
    let calls = 0;

    expect(() =>
      assert(false, () => {
        calls += 1;
        return 'Invalid port';
      })
    ).toThrow(AssertionError);
    expect(() =>
      assert(false, () => 'Invalid port')
    ).toThrow('Invalid port');
    expect(calls).toBe(1);
  });

  it('removes null and undefined with ensureNotNullOrUndefined', () => {
    const envPort: null | string | undefined = '3000';
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
