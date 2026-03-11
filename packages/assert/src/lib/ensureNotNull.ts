import { assert, type AssertionFailure } from './assert.js';
import { isNull, type NullConstraint } from './isNull.js';

export function ensureNotNull<T extends V, V = NullConstraint<T>>(
  value: T,
  message?: AssertionFailure,
): Exclude<T, null>;

export function ensureNotNull<T extends V, V = NullConstraint<T>>(
  value: T,
  message: AssertionFailure = () => `Expected ${String(value)} not to be null`,
) {
  assert(!isNull<T, V>(value), message, ensureNotNull);

  return value;
}
