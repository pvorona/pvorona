import { isNumber } from './isNumber.js';

type Equal<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends <
  T
>() => T extends Right ? 1 : 2
  ? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
    ? true
    : false
  : false;

function expectType<Condition extends true>(condition: Condition): void {
  void condition;
}

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

  const explicitGenericNumber = 1 as string | number;
  if (isNumber<string | number, string | number>(explicitGenericNumber)) {
    expectTypeOf(explicitGenericNumber).toEqualTypeOf<number>();
  } else {
    expectTypeOf(explicitGenericNumber).toEqualTypeOf<string>();
  }

  const a5 = 1 as unknown;
  if (isNumber(a5)) {
    expectType<Equal<typeof a5, number>>(true);
  } else {
    expectType<Equal<typeof a5, unknown>>(true);
  }

  // `any` is intentional here to verify the boundary-input contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a6 = 1 as any;
  if (isNumber(a6)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectType<Equal<typeof a6, any>>(true);
  }

  expect(isNumber(Number.NaN as string | number)).toBe(true);
  expect(isNumber(Number.POSITIVE_INFINITY as string | number)).toBe(true);
  expect(isNumber(Number.NEGATIVE_INFINITY as string | number)).toBe(true);
});
