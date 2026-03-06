import { assert, isFunction } from '@pvorona/assert';

const UNSET: unique symbol = Symbol('UNSET');

type FunctionValue = (...args: never[]) => unknown;

type MessageOrFactory = string | (() => string);

type NonFunctionalValue<T> = Extract<T, FunctionValue> extends never ? T : never;

type Getter<T> = () => T;

type ValueOrGetter<T> = T | Getter<T>;

type ReadonlyReferenceShape<T> = Readonly<{
  isSet: boolean;
  isUnset: boolean;
  getOr: {
    <U>(value: NonFunctionalValue<U>): T | NonFunctionalValue<U>;
    <U>(getter: Getter<NonFunctionalValue<U>>): T | NonFunctionalValue<U>;
  };
  getOrThrow: (messageOrFactory?: MessageOrFactory) => T;
}>;

type ReferenceShape<T> = Readonly<{
  isSet: boolean;
  isUnset: boolean;
  getOr: {
    <U>(value: NonFunctionalValue<U>): T | NonFunctionalValue<U>;
    <U>(getter: Getter<NonFunctionalValue<U>>): T | NonFunctionalValue<U>;
  };
  getOrThrow: (messageOrFactory?: MessageOrFactory) => T;
  getOrSet: {
    (value: T): T;
    (getter: Getter<T>): T;
  };
  set: (value: T) => void;
  unset: () => void;
  asReadonly: () => ReadonlyReferenceShape<T>;
}>;

/**
 * A live readonly view of a reference.
 *
 * Use `isSet` and `isUnset` for presence checks, `getOr(...)` for fallback reads,
 * and `getOrThrow(...)` when absence is an error. Function-valued `T` is rejected
 * because function inputs are reserved for lazy getters.
 */
export type ReadonlyReference<T> = Readonly<{
  isSet: boolean;
  isUnset: boolean;
  getOr: {
    <U>(value: Extract<U, (...args: never[]) => unknown> extends never ? U : never):
      | (Extract<T, (...args: never[]) => unknown> extends never ? T : never)
      | (Extract<U, (...args: never[]) => unknown> extends never ? U : never);
    <U>(getter: () => Extract<U, (...args: never[]) => unknown> extends never ? U : never):
      | (Extract<T, (...args: never[]) => unknown> extends never ? T : never)
      | (Extract<U, (...args: never[]) => unknown> extends never ? U : never);
  };
  getOrThrow: (
    messageOrFactory?: string | (() => string),
  ) => Extract<T, (...args: never[]) => unknown> extends never ? T : never;
}>;

/**
 * A mutable reference with explicit empty-state semantics.
 *
 * `createReference(value)` starts set, `createUnsetReference<T>()` starts unset,
 * and `asReadonly()` returns a live readonly view of the same state. Function-
 * valued `T` is rejected because function inputs are reserved for lazy getters
 * and lazy initializers.
 */
export type Reference<T> = Readonly<{
  isSet: boolean;
  isUnset: boolean;
  getOr: {
    <U>(value: Extract<U, (...args: never[]) => unknown> extends never ? U : never):
      | (Extract<T, (...args: never[]) => unknown> extends never ? T : never)
      | (Extract<U, (...args: never[]) => unknown> extends never ? U : never);
    <U>(getter: () => Extract<U, (...args: never[]) => unknown> extends never ? U : never):
      | (Extract<T, (...args: never[]) => unknown> extends never ? T : never)
      | (Extract<U, (...args: never[]) => unknown> extends never ? U : never);
  };
  getOrThrow: (
    messageOrFactory?: string | (() => string),
  ) => Extract<T, (...args: never[]) => unknown> extends never ? T : never;
  getOrSet: {
    (
      value: Extract<T, (...args: never[]) => unknown> extends never ? T : never,
    ): Extract<T, (...args: never[]) => unknown> extends never ? T : never;
    (
      getter: () => Extract<T, (...args: never[]) => unknown> extends never ? T : never,
    ): Extract<T, (...args: never[]) => unknown> extends never ? T : never;
  };
  set: (
    value: Extract<T, (...args: never[]) => unknown> extends never ? T : never,
  ) => void;
  unset: () => void;
  asReadonly: () => ReadonlyReference<T>;
}>;

function hasStoredValue<T>(current: T | typeof UNSET): current is T {
  return current !== UNSET;
}

function assertNonFunctionalValue<T>(
  value: T,
): asserts value is NonFunctionalValue<T> {
  assert(
    !isFunction(value),
    'Reference values cannot be functions; functions are reserved for lazy getters and initializers',
  );
}

function createReferenceInternal<T>(
  initialValue: T | typeof UNSET,
): ReferenceShape<T> {
  let current: T | typeof UNSET = initialValue;

  if (hasStoredValue(current)) {
    assertNonFunctionalValue(current);
  }

  const resolve = <V>(valueOrGetter: ValueOrGetter<V>): V =>
    isFunction(valueOrGetter) ? valueOrGetter() : valueOrGetter;

  const getOr: ReadonlyReferenceShape<T>['getOr'] = <U>(
    valueOrGetter: ValueOrGetter<NonFunctionalValue<U>>,
  ): T | NonFunctionalValue<U> => {
    if (hasStoredValue(current)) return current;

    return resolve(valueOrGetter);
  };

  const getOrThrow = (messageOrFactory?: MessageOrFactory): T => {
    assert(hasStoredValue(current), messageOrFactory ?? 'Reference is not set');

    return current;
  };

  const getOrSet: ReferenceShape<T>['getOrSet'] = (
    valueOrGetter: ValueOrGetter<T>,
  ): T => {
    if (hasStoredValue(current)) return current;

    const nextValue = resolve(valueOrGetter);

    assertNonFunctionalValue(nextValue);

    current = nextValue;

    return current;
  };

  const readonlyReference: ReadonlyReferenceShape<T> = {
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
    getOrSet,
    set: (value: T) => {
      assertNonFunctionalValue(value);

      current = value;
    },
    unset: () => {
      current = UNSET;
    },
    asReadonly: (): ReadonlyReferenceShape<T> => readonlyReference,
  };
}

/**
 * Create a reference that starts set to `initialValue`.
 *
 * Passing `undefined` or `null` stores that exact value. Use
 * `createUnsetReference<T>()` when you need an empty reference instead. Functions
 * cannot be stored directly; function inputs are reserved for lazy getters and
 * lazy initializers.
 */
export function createReference<T>(
  this: Extract<T, (...args: never[]) => unknown> extends never ? void : never,
  initialValue: T,
): Reference<T> {
  assertNonFunctionalValue(initialValue);

  return createReferenceInternal<NonFunctionalValue<T>>(initialValue);
}

/**
 * Create a reference that starts unset.
 *
 * Use `isSet`, `isUnset`, `getOr(...)`, `getOrThrow(...)`, and `getOrSet(...)`
 * to observe or initialize it later. Functions cannot be used as `T` because
 * function inputs are reserved for lazy getters and lazy initializers.
 */
export function createUnsetReference<T>(
  this: Extract<T, (...args: never[]) => unknown> extends never ? void : never,
): Reference<T> {
  return createReferenceInternal<NonFunctionalValue<T>>(UNSET);
}
