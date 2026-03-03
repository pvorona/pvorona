import { isNotNull } from './isNotNull.js';

test('isNotNull', () => {
  // @ts-expect-error "Must not be null only type"
  isNotNull(null);

  // @ts-expect-error "Must include null"
  isNotNull(1);
  // @ts-expect-error "Must include null"
  isNotNull(true);
  // @ts-expect-error "Must include null"
  isNotNull('');
  // @ts-expect-error "Must include null"
  isNotNull(Symbol());
  // @ts-expect-error "Must include null"
  isNotNull(0n);
  // @ts-expect-error "Must include null"
  isNotNull({});
  // @ts-expect-error "Must include null"
  isNotNull({ a: 1 });
  // @ts-expect-error "Must include null"
  isNotNull([]);
  // @ts-expect-error "Must include null"
  isNotNull([] as const);
  // @ts-expect-error "Must include null"
  isNotNull([1, 2] as const);

  const a1 = [1] as number[] | null;
  if (isNotNull(a1)) {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<null>();
  }

  const a2 = undefined as undefined | null;
  if (isNotNull(a2)) {
    expectTypeOf(a2).toEqualTypeOf<undefined>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<null>();
  }

  const a3 = '' as string | null;
  if (isNotNull(a3)) {
    expectTypeOf(a3).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<null>();
  }

  const a4 = [1, 2] as [number, number] | null;
  if (isNotNull(a4)) {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<null>();
  }
});
