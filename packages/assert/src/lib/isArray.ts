import {
  AtLeastOneValid,
  IncludesArrayOrArrayLiteralMember,
  InferErrorMessage,
  NotOnlyArray,
} from './types.js';

export function isArray<
  T extends V,
  V = InferErrorMessage<
    NotOnlyArray<AtLeastOneValid<IncludesArrayOrArrayLiteralMember<T>>>
  >,
>(
  value: T,
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of unknown[]
): value is unknown[] {
  return Array.isArray(value);
}
