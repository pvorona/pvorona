import {
  type IncludesNullMember,
  type NotOnlyNull,
  type DisplayDiagnostics,
} from './types.js';

export type NullConstraint<T> = DisplayDiagnostics<
  NotOnlyNull<IncludesNullMember<T>>
>;

export function isNull<T extends V, V = NullConstraint<T>>(
  value: T,
): value is Extract<T, null> {
  return value === null;
}
