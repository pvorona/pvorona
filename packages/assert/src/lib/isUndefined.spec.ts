import { isUndefined } from './isUndefined.js';

test('isUndefined', () => {
  // @ts-expect-error "Must not be undefined only type"
  isUndefined(undefined);

  // @ts-expect-error "Must include undefined"
  isUndefined(1);
  // @ts-expect-error "Must include undefined"
  isUndefined(true);
  // @ts-expect-error "Must include undefined"
  isUndefined('');
  // @ts-expect-error "Must include undefined"
  isUndefined(Symbol());
  // @ts-expect-error "Must include undefined"
  isUndefined(0n);
  // @ts-expect-error "Must include undefined"
  isUndefined(null);
  // @ts-expect-error "Must include undefined"
  isUndefined({});
  // @ts-expect-error "Must include undefined"
  isUndefined({ a: 1 });
  // @ts-expect-error "Must include undefined"
  isUndefined([]);
  // @ts-expect-error "Must include undefined"
  isUndefined([] as const);
  // @ts-expect-error "Must include undefined"
  isUndefined([1, 2] as const);

  const a1 = [1] as number[] | undefined;
  if (isUndefined(a1)) {
    expectTypeOf(a1).toEqualTypeOf<undefined>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  }

  const a2 = undefined as undefined | null;
  if (isUndefined(a2)) {
    expectTypeOf(a2).toEqualTypeOf<undefined>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<null>();
  }

  const a3 = '' as string | undefined;
  if (isUndefined(a3)) {
    expectTypeOf(a3).toEqualTypeOf<undefined>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<string>();
  }

  const a4 = [1, 2] as [number, number] | undefined;
  if (isUndefined(a4)) {
    expectTypeOf(a4).toEqualTypeOf<undefined>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  }

  const explicitGenericUndefined = undefined as string | undefined;
  if (
    isUndefined<string | undefined, string | undefined>(
      explicitGenericUndefined
    )
  ) {
    expectTypeOf(explicitGenericUndefined).toEqualTypeOf<undefined>();
  } else {
    expectTypeOf(explicitGenericUndefined).toEqualTypeOf<string>();
  }

  const a5 = (Math.random() > 0.5 ? undefined : 'value') as unknown;
  if (isUndefined(a5)) {
    expectTypeOf(a5).toEqualTypeOf<undefined>();
  }

  // `any` is intentional here to verify the boundary-input contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a6 = undefined as any;
  if (isUndefined(a6)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectTypeOf(a6).toEqualTypeOf<any>();
  }
});
