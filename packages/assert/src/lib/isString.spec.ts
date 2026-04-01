import { isString } from './isString.js';

test('isString', () => {
  // @ts-expect-error "Must not be string only type"
  isString('1');

  // @ts-expect-error "Must not be string only type"
  isString('1' as '1' | '2');

  // @ts-expect-error "Must include string or string literal"
  isString(1);
  // @ts-expect-error "Must include string or string literal"
  isString(true);
  // @ts-expect-error "Must include string or string literal"
  isString('');
  // @ts-expect-error "Must include string or string literal"
  isString(Symbol());
  // @ts-expect-error "Must include string or string literal"
  isString(0n);
  // @ts-expect-error "Must include string or string literal"
  isString(undefined);
  // @ts-expect-error "Must include string or string literal"
  isString(null);
  // @ts-expect-error "Must include string or string literal"
  isString({ a: 1 });

  const a1 = [1] as number[] | string;
  if (isString(a1)) {
    expectTypeOf(a1).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a1).toEqualTypeOf<number[]>();
  }

  const a2 = [] as [] | string;
  if (isString(a2)) {
    expectTypeOf(a2).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a2).toEqualTypeOf<[]>();
  }

  const a3 = '' as boolean | string;
  if (isString(a3)) {
    expectTypeOf(a3).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a3).toEqualTypeOf<boolean>();
  }

  const a4 = [1, 2] as [number, number] | string;
  if (isString(a4)) {
    expectTypeOf(a4).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a4).toEqualTypeOf<[number, number]>();
  }

  const explicitGenericString = 'value' as string | number;
  if (isString<string | number, string | number>(explicitGenericString)) {
    expectTypeOf(explicitGenericString).toEqualTypeOf<string>();
  } else {
    expectTypeOf(explicitGenericString).toEqualTypeOf<number>();
  }

  const a5 = 'value' as unknown;
  if (isString(a5)) {
    expectTypeOf(a5).toEqualTypeOf<string>();
  } else {
    expectTypeOf(a5).toEqualTypeOf<unknown>();
  }

  // `any` is intentional here to verify the boundary-input contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a6 = 'value' as any;
  if (isString(a6)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectTypeOf(a6).toEqualTypeOf<any>();
  }
});
