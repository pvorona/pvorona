import { ensureNotNullOrUndefined } from './ensureNotNullOrUndefined.js';

test('ensureNotNullOrUndefined', () => {
  expect(
    // @ts-expect-error "Must not be (null | undefined) only type"
    () => ensureNotNullOrUndefined(null as null | undefined)
  ).toThrow();

  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined(1);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined(true);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined('');
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined(Symbol());
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined(0n);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined({});
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined({ a: 1 });
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined([]);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined([] as const);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined([1, 2] as const);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined('' as string | null);
  // @ts-expect-error "Must include (null | undefined)"
  ensureNotNullOrUndefined('' as string | undefined);

  const a1 = ensureNotNullOrUndefined(1 as number | undefined | null);
  expectTypeOf(a1).toEqualTypeOf<number>();

  const a2 = ensureNotNullOrUndefined(true as boolean | undefined | null);
  expectTypeOf(a2).toEqualTypeOf<boolean>();

  const a3 = ensureNotNullOrUndefined([1] as number[] | (null | undefined));
  expectTypeOf(a3).toEqualTypeOf<number[]>();

  const a4 = ensureNotNullOrUndefined('' as string | null | undefined);
  expectTypeOf(a4).toEqualTypeOf<string>();

  const a5 = ensureNotNullOrUndefined([1, 2] as
    | [number, number]
    | null
    | undefined);
  expectTypeOf(a5).toEqualTypeOf<[number, number]>();
});
