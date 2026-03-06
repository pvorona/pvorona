import { isInteger } from './isInteger.js';

test('isInteger', () => {
  expect(isInteger(1)).toBe(true);
  expect(isInteger(0)).toBe(true);
  expect(isInteger(1.5)).toBe(false);
  expect(isInteger(Infinity)).toBe(false);
});
