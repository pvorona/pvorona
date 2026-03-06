import { assert } from './assert.js';
import {
  isNonEmptyArray,
  NonEmptyArray,
  ReadonlyNonEmptyArray,
} from './isNonEmptyArray.js';

export function ensureNonEmptyArray<T>(
  value: T[],
  message?: string,
): NonEmptyArray<T>;
export function ensureNonEmptyArray<T>(
  value: readonly T[],
  message?: string,
): ReadonlyNonEmptyArray<T>;
export function ensureNonEmptyArray<T>(
  value: readonly T[],
  message = 'Expected non-empty array',
): NonEmptyArray<T> | ReadonlyNonEmptyArray<T> {
  assert(isNonEmptyArray(value), message, ensureNonEmptyArray);
  return value;
}
