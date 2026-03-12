import { ensureNumber } from './ensureNumber.js';

test('ensureNumber', () => {
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber(true),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber(''),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber(Symbol()),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber(0n),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber(undefined),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber(null),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include number or number literal"
    ensureNumber({ a: 1 }),
  ).toThrow();

  const a1 = ensureNumber(1 as number[] | number);
  expectTypeOf(a1).toEqualTypeOf<number>();

  const a2 = ensureNumber(1 as [] | number);
  expectTypeOf(a2).toEqualTypeOf<number>();

  const a3 = ensureNumber(1 as string | number);
  expectTypeOf(a3).toEqualTypeOf<number>();

  const a4 = ensureNumber(1 as [number, number] | number);
  expectTypeOf(a4).toEqualTypeOf<number>();

  expect(ensureNumber(Number.NaN as string | number)).toBeNaN();
  expect(ensureNumber(Number.POSITIVE_INFINITY as string | number)).toBe(
    Number.POSITIVE_INFINITY,
  );
  expect(ensureNumber(Number.NEGATIVE_INFINITY as string | number)).toBe(
    Number.NEGATIVE_INFINITY,
  );
});
