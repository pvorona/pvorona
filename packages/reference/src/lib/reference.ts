import { assert, isFunction } from '@pvorona/assert';

const UNSET: unique symbol = Symbol('UNSET');

export type ReadonlyReference<T> = Readonly<{
  isSet: boolean;
  isUnset: boolean;
  getOr: <U>(valueOrGetter: U | (() => U)) => T | U;
  getOrThrow: (messageOrFactory?: string | (() => string)) => T;
}>;

export type Reference<T> = Readonly<{
  isSet: boolean;
  isUnset: boolean;
  getOr: <U>(valueOrGetter: U | (() => U)) => T | U;
  getOrThrow: (messageOrFactory?: string | (() => string)) => T;
  getOrSet: (valueOrGetter: T | (() => T)) => T;
  set: (value: T) => void;
  unset: () => void;
  asReadonly: () => ReadonlyReference<T>;
}>;

function hasStoredValue<T>(current: T | typeof UNSET): current is T {
  return current !== UNSET;
}

function createReferenceInternal<T>(initialValue: T | typeof UNSET): Reference<T> {
  let current: T | typeof UNSET = initialValue;

  const resolve = <V>(valueOrGetter: V | (() => V)): V =>
    isFunction(valueOrGetter) ? valueOrGetter() : valueOrGetter;

  const getOr = <U>(valueOrGetter: U | (() => U)): T | U => {
    if (hasStoredValue(current)) return current;

    return resolve(valueOrGetter);
  };

  const getOrThrow = (messageOrFactory?: string | (() => string)): T => {
    assert(hasStoredValue(current), messageOrFactory ?? 'Reference is not set');

    return current;
  };

  const readonlyReference: ReadonlyReference<T> = {
    get isSet() {
      return hasStoredValue(current);
    },
    get isUnset() {
      return !hasStoredValue(current);
    },
    getOr,
    getOrThrow,
  };

  return {
    get isSet() {
      return hasStoredValue(current);
    },
    get isUnset() {
      return !hasStoredValue(current);
    },
    getOr,
    getOrThrow,
    getOrSet: (valueOrGetter: T | (() => T)) => {
      if (hasStoredValue(current)) return current;

      current = resolve(valueOrGetter);

      return current;
    },
    set: (value: T) => {
      current = value;
    },
    unset: () => {
      current = UNSET;
    },
    asReadonly: (): ReadonlyReference<T> => readonlyReference,
  };
}

export function createReference<T>(initialValue: T): Reference<T> {
  return createReferenceInternal(initialValue);
}

export function createUnsetReference<T>(): Reference<T> {
  return createReferenceInternal<T>(UNSET);
}
