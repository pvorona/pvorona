import { isEmptyArray } from './isEmptyArray.js';

test('isEmptyArray', () => {
  expect(isEmptyArray([])).toBe(true);
  expect(isEmptyArray([1])).toBe(false);

  const value = [] as [] | [number];
  if (isEmptyArray(value)) {
    expectTypeOf(value).toEqualTypeOf<[]>();
  } else {
    expectTypeOf(value).toEqualTypeOf<[number]>();
  }
});
