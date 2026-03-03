import { assert } from './assert.js';
import { isNonEmptyArray, NonEmptyArray } from './isNonEmptyArray.js';

export function ensureNonEmptyArray<T>(
  value: readonly T[],
  message = 'Expected non-empty array',
): NonEmptyArray<T> {
  assert(isNonEmptyArray(value), message, ensureNonEmptyArray);
  return value;
}
