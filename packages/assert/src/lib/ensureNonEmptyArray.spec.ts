import { ensureNonEmptyArray } from './ensureNonEmptyArray.js';
import { NonEmptyArray } from './isNonEmptyArray.js';

test('ensureNonEmptyArray', () => {
  expect(() => ensureNonEmptyArray([])).toThrow();

  const mutableValue = ensureNonEmptyArray([1, 2] as number[]);
  expectTypeOf(mutableValue).toEqualTypeOf<NonEmptyArray<number>>();
  expect(mutableValue).toEqual([1, 2]);

  const readonlyValue = ensureNonEmptyArray([1, 2] as readonly number[]);
  // @ts-expect-error "Readonly result must not allow mutation"
  const readonlyMutableValue: number[] = readonlyValue;
  expect(readonlyMutableValue).toEqual([1, 2]);
});
