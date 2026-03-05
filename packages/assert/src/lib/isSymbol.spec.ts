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
});
