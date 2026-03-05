import {
  isNonEmptyArray,
  NonEmptyArray,
  ReadonlyNonEmptyArray,
} from './isNonEmptyArray.js';

test('isNonEmptyArray', () => {
  expect(isNonEmptyArray([])).toBe(false);
  expect(isNonEmptyArray([1])).toBe(true);
  expect(isNonEmptyArray([1] as const)).toBe(true);

  const mutableValue = [1] as number[];
  if (isNonEmptyArray(mutableValue)) {
    expectTypeOf(mutableValue).toEqualTypeOf<NonEmptyArray<number>>();
  }

  const readonlyValue = [1] as readonly number[];
  if (isNonEmptyArray(readonlyValue)) {
    expectTypeOf(readonlyValue).toEqualTypeOf<ReadonlyNonEmptyArray<number>>();
  }
});
