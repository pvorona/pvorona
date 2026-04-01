import { assert, type AssertionFailure } from './assert.js';
import { isDefined } from './isDefined.js';
import { type UndefinedConstraint } from './isUndefined.js';

export function ensureDefined<T extends V, V = UndefinedConstraint<T>>(
  value: T,
  message: AssertionFailure = () => `Expected ${String(value)} to be defined`
): Exclude<T, undefined> {
  assert(isDefined<T, V>(value), message, ensureDefined);

  return value;
}
