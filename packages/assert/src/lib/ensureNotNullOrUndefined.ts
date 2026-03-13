import { assert, type AssertionFailure } from './assert.js';
import {
  isNullOrUndefined,
  type NullOrUndefinedConstraint,
} from './isNullOrUndefined.js';

export function ensureNotNullOrUndefined<
  T extends V,
  V = NullOrUndefinedConstraint<T>,
>(value: T, message?: AssertionFailure): Exclude<T, null | undefined>;

export function ensureNotNullOrUndefined<
  T extends V,
  V = NullOrUndefinedConstraint<T>,
>(
  value: T,
  message: AssertionFailure = () =>
    `Expected ${String(value)} not to be null or undefined`,
) {
  assert(
    !isNullOrUndefined<T, V>(value),
    message,
    ensureNotNullOrUndefined,
  );

  return value;
}
