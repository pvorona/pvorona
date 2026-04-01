import {
  type AtLeastOneValid,
  type IncludesArrayOrArrayLiteralMember,
  type DisplayDiagnostics,
  type NotOnlyArray,
} from './types.js';

export type ArrayConstraint<T> = DisplayDiagnostics<
  NotOnlyArray<AtLeastOneValid<IncludesArrayOrArrayLiteralMember<T>>>
>;

export function isArray<T extends V, V = ArrayConstraint<T>>(
  value: T
): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, readonly unknown[]>
  | ([unknown] extends [T] ? unknown[] : never) {
  return Array.isArray(value);
}
