import { isNumber } from './isNumber.js';

test('isNumber', () => {
  // @ts-expect-error "Must not be number only type"
  isNumber(1);

  // @ts-expect-error "Must not be number only type"
  isNumber(1 as 1 | 2);

  // @ts-expect-error "Must include number or number literal"
  isNumber(true);
  // @ts-expect-error "Must include number or number literal"
  isNumber('');
  // @ts-expect-error "Must include number or number literal"
  isNumber(Symbol());
  // @ts-expect-error "Must include number or number literal"
  isNumber(0n);
  // @ts-expect-error "Must include number or number literal"
  isNumber(undefined);
  // @ts-expect-error "Must include number or number literal"
  isNumber(null);
  // @ts-expect-error "Must include number or number literal"
  isNumber({ a: 1 });

  const a1 = [1] as number[] | number;
  if (isNumber(a1)) {
    expectTypeOf(a1).toEqualTypeOf<number>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  }

  const a2 = [] as [] | number;
  if (isNumber(a2)) {
    expectTypeOf(a2).toEqualTypeOf<number>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<[]>();
  }

  const a3 = '' as string | number;
  if (isNumber(a3)) {
    expectTypeOf(a3).toEqualTypeOf<number>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<string>();
  }

  const a4 = [1, 2] as [number, number] | number;
  if (isNumber(a4)) {
    expectTypeOf(a4).toEqualTypeOf<number>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  }
});
