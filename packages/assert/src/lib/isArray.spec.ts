import { isArray } from './isArray.js';

test('isArray', () => {
  // @ts-expect-error "Must not be array only type"
  isArray([]);

  // @ts-expect-error "Must not be array only type"
  isArray([] as [] | string[]);

  // @ts-expect-error "Must include array or array literal"
  isArray(1);
  // @ts-expect-error "Must include array or array literal"
  isArray(true);
  // @ts-expect-error "Must include array or array literal"
  isArray('');
  // @ts-expect-error "Must include array or array literal"
  isArray(Symbol());
  // @ts-expect-error "Must include array or array literal"
  isArray(0n);
  // @ts-expect-error "Must include array or array literal"
  isArray(undefined);
  // @ts-expect-error "Must include array or array literal"
  isArray(null);
  // @ts-expect-error "Must include array or array literal"
  isArray({ a: 1 });

  const a1 = [1] as number[] | null;
  if (isArray(a1)) {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<null>();
  }

  const a2 = [] as [] | null;
  if (isArray(a2)) {
    expectTypeOf(a2).toEqualTypeOf<[]>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<null>();
  }

  const a3 = '' as string | [];
  if (isArray(a3)) {
    expectTypeOf(a3).toEqualTypeOf<[]>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<string>();
  }

  const a4 = [1, 2] as [number, number] | string;
  if (isArray(a4)) {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<string>();
  }
});
