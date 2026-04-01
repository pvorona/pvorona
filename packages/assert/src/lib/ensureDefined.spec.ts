import { ensureDefined } from './ensureDefined.js';

test('ensureDefined', () => {
  expect(() =>
    // @ts-expect-error "Must not be undefined only type"
    ensureDefined(undefined)
  ).toThrow();

  // @ts-expect-error "Must include undefined"
  ensureDefined(1);
  // @ts-expect-error "Must include undefined"
  ensureDefined(true);
  // @ts-expect-error "Must include undefined"
  ensureDefined('');
  // @ts-expect-error "Must include undefined"
  ensureDefined(Symbol());
  // @ts-expect-error "Must include undefined"
  ensureDefined(0n);
  // @ts-expect-error "Must include undefined"
  ensureDefined(null);
  // @ts-expect-error "Must include undefined"
  ensureDefined({});
  // @ts-expect-error "Must include undefined"
  ensureDefined({ a: 1 });
  // @ts-expect-error "Must include undefined"
  ensureDefined([]);
  // @ts-expect-error "Must include undefined"
  ensureDefined([] as const);
  // @ts-expect-error "Must include undefined"
  ensureDefined([1, 2] as const);

  const a1 = ensureDefined([1] as number[] | undefined);
  expectTypeOf(a1).toEqualTypeOf<number[]>();

  const a2 = ensureDefined(null as undefined | null);
  expectTypeOf(a2).toEqualTypeOf<null>();

  const a3 = ensureDefined('' as string | undefined);
  expectTypeOf(a3).toEqualTypeOf<string>();

  const a4 = ensureDefined([1, 2] as [number, number] | undefined);
  expectTypeOf(a4).toEqualTypeOf<[number, number]>();
});
