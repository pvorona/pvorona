import { assert, isFunction } from '@pvorona/assert';

const UNSET: unique symbol = Symbol('UNSET');

export type ReadonlyReference<T> = Readonly<{
  getOr: <U>(valueOrGetter: U | (() => U)) => T | U;
  getOrThrow: (messageOrFactory?: string | (() => string)) => T;
}>;

export type Reference<T> = Readonly<{
  getOr: <U>(valueOrGetter: U | (() => U)) => T | U;
  getOrThrow: (messageOrFactory?: string | (() => string)) => T;
  getOrSet: (valueOrGetter: T | (() => T)) => T;
  set: (value: T) => void;
  unset: () => void;
  asReadonly: () => ReadonlyReference<T>;
}>;

export function createReference<T>(initialValue: T): Reference<T> {
  let current: T | typeof UNSET = initialValue;

  const isSet = (): current is T => current !== UNSET;

  const resolve = <V>(valueOrGetter: V | (() => V)): V =>
    isFunction(valueOrGetter) ? valueOrGetter() : valueOrGetter;

  const getOr = <U>(valueOrGetter: U | (() => U)): T | U => {
    if (isSet()) return current;

    return resolve(valueOrGetter);
  };

  const getOrThrow = (messageOrFactory?: string | (() => string)): T => {
    assert(isSet(), messageOrFactory ?? 'Reference is not set');

    return current;
  };

  return {
    getOr,
    getOrThrow,
    getOrSet: (valueOrGetter: T | (() => T)) => {
      if (isSet()) return current;

      current = resolve(valueOrGetter);

      return current;
    },
    set: (value: T) => {
      current = value;
    },
    unset: () => {
      current = UNSET;
    },
    asReadonly: (): ReadonlyReference<T> => ({ getOr, getOrThrow }),
  };
}
