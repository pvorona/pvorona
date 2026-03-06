import { isPositive } from './isPositive.js';

test('isPositive', () => {
  expect(isPositive(1)).toBe(true);
  expect(isPositive(0)).toBe(false);
  expect(isPositive(-1)).toBe(false);
});
