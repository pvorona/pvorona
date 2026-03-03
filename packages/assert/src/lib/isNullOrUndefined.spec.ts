import { isNullOrUndefined } from './isNullOrUndefined.js';

test('isNullOrUndefined', () => {
  // @ts-expect-error "Must not be (null | undefined) only type"
  isNullOrUndefined(null as null | undefined);

  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined(1);
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined(true);
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined('');
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined(Symbol());
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined(0n);
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined({});
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined({ a: 1 });
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined([]);
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined([] as const);
  // @ts-expect-error "Must include (null | undefined)"
  isNullOrUndefined([1, 2] as const);

  const a1 = undefined as number | undefined | null;
  if (isNullOrUndefined(a1)) {
    expectTypeOf(a1).toEqualTypeOf<null | undefined>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<number>();
  }

  const a2 = true as boolean | undefined | null;
  if (isNullOrUndefined(a2)) {
    expectTypeOf(a2).toEqualTypeOf<null | undefined>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<boolean>();
  }

  const a3 = [1] as number[] | (null | undefined);
  if (isNullOrUndefined(a3)) {
    expectTypeOf(a3).toEqualTypeOf<null | undefined>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<number[]>();
  }

  const a4 = '' as string | null | undefined;
  if (isNullOrUndefined(a4)) {
    expectTypeOf(a4).toEqualTypeOf<null | undefined>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<string>();
  }

  const a5 = [1, 2] as [number, number] | null | undefined;
  if (isNullOrUndefined(a5)) {
    expectTypeOf(a5).toEqualTypeOf<null | undefined>();
  } else {
    expectTypeOf(a5).toEqualTypeOf<[number, number]>();
  }
});
