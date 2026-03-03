import {
  AtLeastOneValid,
  IncludesNumberOrNumberLiteralMember,
  InferErrorMessage,
  NotOnlyNumber,
} from './types.js';

export function isNumber<
  T extends V,
  V = InferErrorMessage<
    NotOnlyNumber<AtLeastOneValid<IncludesNumberOrNumberLiteralMember<T>>>
  >,
>(value: T): value is Extract<T, number> {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
