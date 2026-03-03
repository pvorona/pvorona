import { ensureString } from './ensureString.js';

test('ensureString', () => {
  // @ts-expect-error "Must not be string only type"
  ensureString('1');

  // @ts-expect-error "Must not be string only type"
  ensureString('1' as '1' | '2');

  expect(
    // @ts-expect-error "Must include string or string literal"
    () => ensureString(1),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include string or string literal"
    ensureString(true),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include string or string literal"
    ensureString(Symbol()),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include string or string literal"
    ensureString(0n),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include string or string literal"
    ensureString(undefined),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include string or string literal"
    ensureString(null),
  ).toThrow();
  expect(() =>
    // @ts-expect-error "Must include string or string literal"
    ensureString({ a: 1 }),
  ).toThrow();

  const a1 = ensureString('1' as number[] | string);
  expectTypeOf(a1).toEqualTypeOf<string>();

  const a2 = ensureString('' as [] | string);
  expectTypeOf(a2).toEqualTypeOf<string>();

  const a3 = ensureString('' as boolean | string);
  expectTypeOf(a3).toEqualTypeOf<string>();

  const a4 = ensureString('[1, 2]' as [number, number] | string);
  expectTypeOf(a4).toEqualTypeOf<string>();

  const a5 = ensureString(
    'string1' as [number, number] | 'string1' | 'string2',
  );
  expectTypeOf(a5).toEqualTypeOf<'string1' | 'string2'>();
});
