import { isDefined } from './isDefined.js';

test('isDefined', () => {
  // @ts-expect-error "Must not be undefined only type"
  isDefined(undefined);

  // @ts-expect-error "Must include undefined"
  isDefined(1);
  // @ts-expect-error "Must include undefined"
  isDefined(true);
  // @ts-expect-error "Must include undefined"
  isDefined('');
  // @ts-expect-error "Must include undefined"
  isDefined(Symbol());
  // @ts-expect-error "Must include undefined"
  isDefined(0n);
  // @ts-expect-error "Must include undefined"
  isDefined(null);
  // @ts-expect-error "Must include undefined"
  isDefined({});
  // @ts-expect-error "Must include undefined"
  isDefined({ a: 1 });
  // @ts-expect-error "Must include undefined"
  isDefined([]);
  // @ts-expect-error "Must include undefined"
  isDefined([] as const);
  // @ts-expect-error "Must include undefined"
  isDefined([1, 2] as const);

  const a1 = [1] as number[] | undefined;
  if (isDefined(a1)) {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<undefined>();
  }

  const a2 = undefined as undefined | null;
  if (isDefined(a2)) {
    expectTypeOf(a2).toEqualTypeOf<null>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<undefined>();
  }

  const a3 = '' as string | undefined;
  if (isDefined(a3)) {
    expectTypeOf(a3).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<undefined>();
  }

  const a4 = [1, 2] as [number, number] | undefined;
  if (isDefined(a4)) {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<undefined>();
  }
});
