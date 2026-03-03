import {
  AtLeastOneValid,
  IncludesStringOrStringLiteralMember,
  InferErrorMessage,
  NotOnlyString,
} from './types.js';

export function isString<
  T extends V,
  V = InferErrorMessage<
    NotOnlyString<AtLeastOneValid<IncludesStringOrStringLiteralMember<T>>>
  >,
>(value: T): value is Extract<T, string> {
  return typeof value === 'string';
}
