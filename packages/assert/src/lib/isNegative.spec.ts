import { isNegative } from './isNegative.js';

test('isNegative', () => {
  expect(isNegative(-1)).toBe(true);
  expect(isNegative(0)).toBe(false);
  expect(isNegative(1)).toBe(false);
});
