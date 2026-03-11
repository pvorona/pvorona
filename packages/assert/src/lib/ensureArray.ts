import { assert, type AssertionFailure } from './assert.js';
import { isArray, type ArrayConstraint } from './isArray.js';

export function ensureArray<T extends V, V = ArrayConstraint<T>>(
  value: T,
  message?: AssertionFailure,
): Extract<T, readonly unknown[]>;

export function ensureArray<T extends V, V = ArrayConstraint<T>>(
  value: T,
  message: AssertionFailure = () => `Expected ${String(value)} to be array`,
) {
  assert(isArray<T, V>(value), message, ensureArray);

  return value;
}
