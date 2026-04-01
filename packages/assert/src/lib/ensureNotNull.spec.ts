import { ensureNotNull } from './ensureNotNull.js';

test('ensureNotNull', () => {
  expect(() =>
    // @ts-expect-error "Must not be null only type"
    ensureNotNull(null)
  ).toThrow();

  // @ts-expect-error "Must include null"
  ensureNotNull(1);
  // @ts-expect-error "Must include null"
  ensureNotNull(true);
  // @ts-expect-error "Must include null"
  ensureNotNull('');
  // @ts-expect-error "Must include null"
  ensureNotNull(Symbol());
  // @ts-expect-error "Must include null"
  ensureNotNull(0n);
  // @ts-expect-error "Must include null"
  ensureNotNull({});
  // @ts-expect-error "Must include null"
  ensureNotNull({ a: 1 });
  // @ts-expect-error "Must include null"
  ensureNotNull([]);
  // @ts-expect-error "Must include null"
  ensureNotNull([] as const);
  // @ts-expect-error "Must include null"
  ensureNotNull([1, 2] as const);

  const a1 = ensureNotNull([1] as number[] | null);
  expectTypeOf(a1).toEqualTypeOf<number[]>();

  const a2 = ensureNotNull(undefined as undefined | null);
  expectTypeOf(a2).toEqualTypeOf<undefined>();

  const a3 = ensureNotNull('' as string | null);
  expectTypeOf(a3).toEqualTypeOf<string>();

  const a4 = ensureNotNull([1, 2] as [number, number] | null);
  expectTypeOf(a4).toEqualTypeOf<[number, number]>();
});
