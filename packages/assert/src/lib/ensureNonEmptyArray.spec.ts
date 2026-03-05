import { ensureNonEmptyArray } from './ensureNonEmptyArray.js';
import { NonEmptyArray, ReadonlyNonEmptyArray } from './isNonEmptyArray.js';

test('ensureNonEmptyArray', () => {
  expect(() => ensureNonEmptyArray([])).toThrow();

  const mutableValue = ensureNonEmptyArray([1, 2] as number[]);
  expectTypeOf(mutableValue).toEqualTypeOf<NonEmptyArray<number>>();
  expect(mutableValue).toEqual([1, 2]);

  const readonlyValue = ensureNonEmptyArray([1, 2] as readonly number[]);
  expectTypeOf(readonlyValue).toEqualTypeOf<ReadonlyNonEmptyArray<number>>();
  expect(readonlyValue).toEqual([1, 2]);
});
