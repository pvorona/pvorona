import { isEmptyArray } from './isEmptyArray.js';
import { Override } from './types.js';

export type NonEmptyArray<T> = Override<
  [T, ...T[]],
  {
    map<U>(
      callbackfn: (value: T, index: number, array: T[]) => U,
      thisArg?: NonEmptyArray<T>,
    ): NonEmptyArray<U>;
  }
>;
export type ReadonlyNonEmptyArray<T> = Override<
  readonly [T, ...T[]],
  {
    map<U>(
      callbackfn: (value: T, index: number, array: T[]) => U,
      thisArg?: ReadonlyNonEmptyArray<T>,
    ): NonEmptyArray<U>;
  }
>;

export function isNonEmptyArray<T>(
  value: readonly T[],
): value is NonEmptyArray<T> {
  return !isEmptyArray(value);
}
