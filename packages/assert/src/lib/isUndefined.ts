import {
  type IncludesUndefinedMember,
  type NotOnlyUndefined,
  type DisplayDiagnostics,
} from './types.js';

export type UndefinedConstraint<T> = DisplayDiagnostics<
  NotOnlyUndefined<IncludesUndefinedMember<T>>
>;

export function isUndefined<T extends V, V = UndefinedConstraint<T>>(
  value: T,
): value is Extract<T, undefined> {
  return typeof value === 'undefined';
}
