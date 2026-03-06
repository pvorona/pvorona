import {
  isNonEmptyArray,
  NonEmptyArray,
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
    // @ts-expect-error "Readonly narrowing must remain readonly"
    const mutableValue: number[] = readonlyValue;
    expect(mutableValue).toEqual([1]);
  }
});
