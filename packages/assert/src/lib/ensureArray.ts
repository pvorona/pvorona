import { assert } from './assert.js';
import { isArray } from './isArray.js';
import {
  AtLeastOneValid,
  IncludesArrayOrArrayLiteralMember,
  InferArrayType,
  InferErrorMessage,
  NotOnlyArray,
} from './types.js';

export function ensureArray<
  T extends V,
  V = InferErrorMessage<
    NotOnlyArray<AtLeastOneValid<IncludesArrayOrArrayLiteralMember<T>>>
  >,
>(
  value: T,
  message = `Expected ${String(value)} to be array`,
): Extract<T, unknown[]> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of unknown[]
  assert(isArray(value), message, ensureArray);

  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of unknown[]
  return value as InferArrayType<T>;
}
