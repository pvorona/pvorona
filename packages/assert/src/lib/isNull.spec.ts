import { isNull } from './isNull.js';

test('isNull', () => {
  // @ts-expect-error "Must not be null only type"
  isNull(null);

  // @ts-expect-error "Must include null"
  isNull(1);
  // @ts-expect-error "Must include null"
  isNull(true);
  // @ts-expect-error "Must include null"
  isNull('');
  // @ts-expect-error "Must include null"
  isNull(Symbol());
  // @ts-expect-error "Must include null"
  isNull(0n);
  // @ts-expect-error "Must include null"
  isNull({});
  // @ts-expect-error "Must include null"
  isNull({ a: 1 });
  // @ts-expect-error "Must include null"
  isNull([]);
  // @ts-expect-error "Must include null"
  isNull([] as const);
  // @ts-expect-error "Must include null"
  isNull([1, 2] as const);

  const a1 = [1] as number[] | null;
  if (isNull(a1)) {
    expectTypeOf(a1).toEqualTypeOf<null>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  }

  const a2 = undefined as undefined | null;
  if (isNull(a2)) {
    expectTypeOf(a2).toEqualTypeOf<null>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<undefined>();
  }

  const a3 = '' as string | null;
  if (isNull(a3)) {
    expectTypeOf(a3).toEqualTypeOf<null>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<string>();
  }

  const a4 = [1, 2] as [number, number] | null;
  if (isNull(a4)) {
    expectTypeOf(a4).toEqualTypeOf<null>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  }
});
