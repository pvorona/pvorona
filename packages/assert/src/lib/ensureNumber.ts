import { assert } from './assert.js';
import { isNumber } from './isNumber.js';
import {
  AtLeastOneValid,
  IncludesNumberOrNumberLiteralMember,
  InferErrorMessage,
} from './types.js';

export function ensureNumber<
  T extends V,
  V = InferErrorMessage<
    AtLeastOneValid<IncludesNumberOrNumberLiteralMember<T>>
  >,
>(
  value: T,
  message = `Expected ${String(value)} to be number`,
): Extract<T, number> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of number
  assert(isNumber(value), message, ensureNumber);

  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of number
  return value;
}
