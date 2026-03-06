import { assert, resolveValueOrGetter } from '@pvorona/assert';

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

function isSet<T>(current: T | typeof UNSET): current is T {
  return current !== UNSET;
}

export function createReference<T>(initialValue: T): Reference<T> {
  let current: T | typeof UNSET = initialValue;

  const getOr = <U>(valueOrGetter: U | (() => U)): T | U => {
    if (isSet(current)) return current;

    return resolveValueOrGetter(valueOrGetter);
  };

  const getOrThrow = (messageOrFactory?: string | (() => string)): T => {
    assert(isSet(current), messageOrFactory ?? 'Reference is not set');

    return current;
  };

  return {
    getOr,
    getOrThrow,
    getOrSet: (valueOrGetter: T | (() => T)) => {
      if (isSet(current)) return current;

      current = resolveValueOrGetter(valueOrGetter);

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
