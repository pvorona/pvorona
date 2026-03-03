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
  let value: T = initialValue;
  let hasValue = true;

  const getOr = <U>(valueOrGetter: U | (() => U)): T | U => {
    if (hasValue) return value;

    return typeof valueOrGetter === 'function'
      ? (valueOrGetter as () => U)()
      : valueOrGetter;
  };

  return {
    getOr,
    getOrThrow: () => {
      throw new Error('Not implemented');
    },
    getOrSet: () => {
      throw new Error('Not implemented');
    },
    set: () => {
      throw new Error('Not implemented');
    },
    unset: () => {
      hasValue = false;
      value = undefined as T;
    },
    asReadonly: () => {
      throw new Error('Not implemented');
    },
  };
}
