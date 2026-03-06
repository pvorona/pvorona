import { assert, resolveValueOrGetter } from '@pvorona/assert';

const UNSET: unique symbol = Symbol('UNSET');

type FunctionValue =
  | ((...args: never[]) => unknown)
  | (abstract new (...args: never[]) => unknown);

type NonFunctionalValue<T> = T extends FunctionValue ? never : T;

export type ReadonlyReference<T> = Readonly<{
  getOr: {
    <U>(value: NonFunctionalValue<U>): T | NonFunctionalValue<U>;
    <U>(getter: () => NonFunctionalValue<U>): T | NonFunctionalValue<U>;
    <U>(
      valueOrGetter: NonFunctionalValue<U> | (() => NonFunctionalValue<U>),
    ): T | NonFunctionalValue<U>;
  };
  getOrThrow: (messageOrFactory?: string | (() => string)) => T;
}>;

export type Reference<T> = Readonly<{
  getOr: {
    <U>(value: NonFunctionalValue<U>): T | NonFunctionalValue<U>;
    <U>(getter: () => NonFunctionalValue<U>): T | NonFunctionalValue<U>;
    <U>(
      valueOrGetter: NonFunctionalValue<U> | (() => NonFunctionalValue<U>),
    ): T | NonFunctionalValue<U>;
  };
  getOrThrow: (messageOrFactory?: string | (() => string)) => T;
  getOrSet: {
    (value: NonFunctionalValue<T>): T;
    (getter: () => NonFunctionalValue<T>): T;
    (valueOrGetter: NonFunctionalValue<T> | (() => NonFunctionalValue<T>)): T;
  };
  set: (value: T) => void;
  unset: () => void;
  asReadonly: () => ReadonlyReference<T>;
}>;

function isSet<T>(current: T | typeof UNSET): current is T {
  return current !== UNSET;
}

export function createReference<T>(initialValue: T): Reference<T> {
  let current: T | typeof UNSET = initialValue;

  const getOr = <U>(
    valueOrGetter: NonFunctionalValue<U> | (() => NonFunctionalValue<U>),
  ): T | NonFunctionalValue<U> => {
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
    getOrSet: (
      valueOrGetter: NonFunctionalValue<T> | (() => NonFunctionalValue<T>),
    ) => {
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
