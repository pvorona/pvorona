import { ensureArray } from './ensureArray.js';

test('ensureArray', () => {
  // @ts-expect-error "Must not be array only type"
  ensureArray([]);

  // @ts-expect-error "Must not be array only type"
  ensureArray([] as [] | string[]);

  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray(1)
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray(true)
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray('')
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray(Symbol())
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray(0n)
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray(undefined)
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray(null)
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include array or array literal"
    ensureArray({ a: 1 })
  ).toThrow();

  const a1 = ensureArray([1] as number[] | null);
  expectTypeOf(a1).toEqualTypeOf<number[]>();

  const a2 = ensureArray([] as [] | null);
  expectTypeOf(a2).toEqualTypeOf<[]>();

  const a3 = ensureArray([] as string | []);
  expectTypeOf(a3).toEqualTypeOf<[]>();

  const a4 = ensureArray([1, 2] as [number, number] | string);
  expectTypeOf(a4).toEqualTypeOf<[number, number]>();

  const a5 = ensureArray([1, 2] as [number, number] | string[] | string);
  expectTypeOf(a5).toEqualTypeOf<[number, number] | string[]>();
});
