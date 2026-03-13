import { assert, type AssertionFailure } from './assert.js';
import { isNumber, type NumberConstraint } from './isNumber.js';

export function ensureNumber<T extends V, V = NumberConstraint<T>>(
  value: T,
  message?: AssertionFailure,
): Extract<T, number>;

export function ensureNumber<T extends V, V = NumberConstraint<T>>(
  value: T,
  message: AssertionFailure = () => `Expected ${String(value)} to be number`,
) {
  assert(isNumber<T, V>(value), message, ensureNumber);

  return value;
}
