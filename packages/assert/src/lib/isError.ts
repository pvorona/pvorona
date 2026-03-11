import {
  type AtLeastOneValid,
  type IncludesErrorOrBoundaryInput,
  type DisplayDiagnostics,
  type NotOnlyErrorUnlessBoundaryInput,
} from './types.js';

type isErrorConstraint<T> = DisplayDiagnostics<
  NotOnlyErrorUnlessBoundaryInput<
    AtLeastOneValid<IncludesErrorOrBoundaryInput<T>>
  >
>;

export function isError<T extends V, V = isErrorConstraint<T>>(
  value: T,
): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, globalThis.Error>
  | ([unknown] extends [T] ? globalThis.Error : never) {
  return value instanceof globalThis.Error;
}
