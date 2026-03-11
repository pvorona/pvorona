import {
  type AtLeastOneValid,
  type IncludesNumberOrNumberLiteralMember,
  type DisplayDiagnostics,
  type NotOnlyNumber,
} from './types.js';

export type NumberConstraint<T> = DisplayDiagnostics<
  NotOnlyNumber<AtLeastOneValid<IncludesNumberOrNumberLiteralMember<T>>>
>;

export function isNumber<T extends V, V = NumberConstraint<T>>(
  value: T,
): value is Extract<T, number> {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
