import {
  assert,
  AssertionError,
  ensureNever,
  ensureNotNullOrUndefined,
  hasOwnPropertyValue,
  isNull,
  isNullOrUndefined,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
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

  it('keeps ensureNever throwing by default', () => {
    expect(() =>
      // @ts-expect-error public surface should reject non-never inputs
      ensureNever('value'),
    ).toThrow('Expected value to be never');

    const value =
      // @ts-expect-error public surface should still allow the silent opt-out
      ensureNever('value', true);
    expect(value).toBe('value');
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

  it('accepts unknown boundary inputs for primitive and nullish guards', () => {
    const maybeString = 'port' as unknown;
    if (isString(maybeString)) {
      expectType<Equal<typeof maybeString, string>>(true);
    }

    const maybeNumber = 42 as unknown;
    if (isNumber(maybeNumber)) {
      expectType<Equal<typeof maybeNumber, number>>(true);
    }

    const maybeNull = (Math.random() > 0.5 ? null : 'value') as unknown;
    if (isNull(maybeNull)) {
      expectType<Equal<typeof maybeNull, null>>(true);
    }

    const maybeUndefined = (Math.random() > 0.5 ? undefined : 'value') as unknown;
    if (isUndefined(maybeUndefined)) {
      expectType<Equal<typeof maybeUndefined, undefined>>(true);
    }

    const maybeNullish = (Math.random() > 0.5 ? undefined : 'value') as unknown;
    if (isNullOrUndefined(maybeNullish)) {
      expectType<Equal<typeof maybeNullish, null | undefined>>(true);
    }

    const maybeSymbol = Symbol('status') as unknown;
    if (isSymbol(maybeSymbol)) {
      expectType<Equal<typeof maybeSymbol, symbol>>(true);
    }
  });

  it('preserves the explicit generic call shape for legacy callers', () => {
    const maybeString = 'port' as string | number;
    if (isString<string | number, string | number>(maybeString)) {
      expectType<Equal<typeof maybeString, string>>(true);
    } else {
      expectType<Equal<typeof maybeString, number>>(true);
    }

    const maybeNumber = 42 as string | number;
    if (isNumber<string | number, string | number>(maybeNumber)) {
      expectType<Equal<typeof maybeNumber, number>>(true);
    } else {
      expectType<Equal<typeof maybeNumber, string>>(true);
    }

    const maybeNull = null as string | null;
    if (isNull<string | null, string | null>(maybeNull)) {
      expectType<Equal<typeof maybeNull, null>>(true);
    } else {
      expectType<Equal<typeof maybeNull, string>>(true);
    }

    const maybeUndefined = undefined as string | undefined;
    if (
      isUndefined<string | undefined, string | undefined>(maybeUndefined)
    ) {
      expectType<Equal<typeof maybeUndefined, undefined>>(true);
    } else {
      expectType<Equal<typeof maybeUndefined, string>>(true);
    }

    const maybeNullish = undefined as string | null | undefined;
    if (
      isNullOrUndefined<
        string | null | undefined,
        string | null | undefined
      >(maybeNullish)
    ) {
      expectType<Equal<typeof maybeNullish, null | undefined>>(true);
    } else {
      expectType<Equal<typeof maybeNullish, string>>(true);
    }

    const maybeSymbol = Symbol('status') as string | symbol;
    if (isSymbol<string | symbol, string | symbol>(maybeSymbol)) {
      expectType<Equal<typeof maybeSymbol, symbol>>(true);
    } else {
      expectType<Equal<typeof maybeSymbol, string>>(true);
    }
  });

  it('keeps any boundary inputs permissive', () => {
    // `any` is intentional here to verify the boundary-input contract.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeString = 'port' as any;
    if (isString(maybeString)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expectType<Equal<typeof maybeString, any>>(true);
    }
  });
});
