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

  const getOrThrow = (messageOrFactory?: string | (() => string)): T => {
    if (hasValue) return value;

    const message =
      typeof messageOrFactory === 'function'
        ? messageOrFactory()
        : (messageOrFactory ?? 'Reference is not set');

    throw new Error(message);
  };

  return {
    getOr,
    getOrThrow,
    getOrSet: (valueOrGetter: T | (() => T)) => {
      if (hasValue) return value;

      const resolved =
        typeof valueOrGetter === 'function'
          ? (valueOrGetter as () => T)()
          : valueOrGetter;

      value = resolved;
      hasValue = true;

      return resolved;
    },
    set: (newValue: T) => {
      value = newValue;
      hasValue = true;
    },
    unset: () => {
      hasValue = false;
      value = undefined as T;
    },
    asReadonly: (): ReadonlyReference<T> => ({ getOr, getOrThrow }),
  };
}
