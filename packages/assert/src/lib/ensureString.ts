import { assert, type AssertionFailure } from './assert.js';
import { isString, type StringConstraint } from './isString.js';

export function ensureString<T extends V, V = StringConstraint<T>>(
  value: T,
  message: AssertionFailure = () => `Expected ${String(value)} to be string`,
): Extract<T, string> {
  assert(isString<T, V>(value), message, ensureString);

  return value;
}
