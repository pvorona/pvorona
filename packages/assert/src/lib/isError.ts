import {
  AtLeastOneValid,
  IncludesErrorOrBoundaryInput,
  InferErrorMessage,
  NotOnlyErrorUnlessBoundaryInput,
} from './types.js';

export function isError<
  T extends V,
  V = InferErrorMessage<
    NotOnlyErrorUnlessBoundaryInput<
      AtLeastOneValid<IncludesErrorOrBoundaryInput<T>>
    >
  >,
>(
  value: T,
  // @ts-expect-error TS can't express this predicate precisely for all `T`
): value is Extract<T, globalThis.Error> | ([unknown] extends [T]
  ? globalThis.Error
  : never) {
  return value instanceof globalThis.Error;
}
