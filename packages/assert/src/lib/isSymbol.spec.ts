import { isSymbol } from './isSymbol.js';

test('isSymbol', () => {
  // @ts-expect-error "Must not be symbol only type"
  isSymbol(Symbol('value'));

  // @ts-expect-error "Must include symbol"
  isSymbol(1);
  // @ts-expect-error "Must include symbol"
  isSymbol(true);
  // @ts-expect-error "Must include symbol"
  isSymbol('');
  // @ts-expect-error "Must include symbol"
  isSymbol(0n);
  // @ts-expect-error "Must include symbol"
  isSymbol(undefined);
  // @ts-expect-error "Must include symbol"
  isSymbol(null);
  // @ts-expect-error "Must include symbol"
  isSymbol({ a: 1 });

  expect(isSymbol(Symbol('value') as string | symbol)).toBe(true);
  expect(isSymbol('value' as string | symbol)).toBe(false);

  const value = Symbol('value') as string | symbol;
  if (isSymbol(value)) {
    expectTypeOf(value).toEqualTypeOf<symbol>();
  } else {
    expectTypeOf(value).toEqualTypeOf<string>();
  }

  const explicitGenericSymbol = Symbol('value') as string | symbol;
  if (isSymbol<string | symbol, string | symbol>(explicitGenericSymbol)) {
    expectTypeOf(explicitGenericSymbol).toEqualTypeOf<symbol>();
  } else {
    expectTypeOf(explicitGenericSymbol).toEqualTypeOf<string>();
  }

  const unknownValue = Symbol('value') as unknown;
  if (isSymbol(unknownValue)) {
    expectTypeOf(unknownValue).toEqualTypeOf<symbol>();
  } else {
    expectTypeOf(unknownValue).toEqualTypeOf<unknown>();
  }

  // `any` is intentional here to verify the boundary-input contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyValue = Symbol('value') as any;
  if (isSymbol(anyValue)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectTypeOf(anyValue).toEqualTypeOf<any>();
  }
});
