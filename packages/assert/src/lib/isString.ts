import {
  type AtLeastOneValid,
  type IncludesStringOrStringLiteralMember,
  type DisplayDiagnostics,
  type NotOnlyString,
} from './types.js';

export type StringConstraint<T> = DisplayDiagnostics<
  NotOnlyString<AtLeastOneValid<IncludesStringOrStringLiteralMember<T>>>
>;

export function isString<T extends V, V = StringConstraint<T>>(
  value: T,
): value is Extract<T, string> {
  return typeof value === 'string';
}
