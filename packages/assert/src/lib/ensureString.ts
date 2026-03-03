import { assert } from './assert.js';
import { isString } from './isString.js';
import {
  AtLeastOneValid,
  IncludesStringOrStringLiteralMember,
  InferErrorMessage,
  NotOnlyString,
} from './types.js';

export function ensureString<
  T extends V,
  V = InferErrorMessage<
    NotOnlyString<AtLeastOneValid<IncludesStringOrStringLiteralMember<T>>>
  >,
>(
  value: T,
  message = `Expected ${String(value)} to be string`,
): Extract<T, string> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of string
  assert(isString(value), message, ensureString);

  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of string
  return value;
}
