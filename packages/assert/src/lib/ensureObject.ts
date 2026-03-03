import { assert } from './assert.js';
import { isObject } from './isObject.js';

export function ensureObject<T>(
  value: T,
  message = `Expected ${String(value)} to be object`,
) {
  assert(isObject(value), message, ensureObject);

  return value;
}
