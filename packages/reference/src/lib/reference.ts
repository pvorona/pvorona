import { assert, isFunction } from '@pvorona/assert';

const UNSET: unique symbol = Symbol('UNSET');

/* eslint-disable @typescript-eslint/no-unsafe-function-type */
type FunctionValue = Function;
/* eslint-enable @typescript-eslint/no-unsafe-function-type */

type MessageOrFactory = string | (() => string);

type IsNonFunctionalValue<T> = Extract<T, FunctionValue> extends never
  ? true
  : false;

type NonFunctionalValue<T> = Extract<T, FunctionValue> extends never ? T : never;

type NonFunctionalThis<T> = IsNonFunctionalValue<T> extends true ? void : never;

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
export type ReadonlyReference<T> = ReadonlyReferenceShape<NonFunctionalValue<T>>;

/**
 * A mutable reference with explicit empty-state semantics.
 *
 * `createReference(value)` starts set, `createUnsetReference<T>()` starts unset,
 * and `asReadonly()` returns a live readonly view of the same state. Function-
 * valued `T` is rejected because function inputs are reserved for lazy getters
 * and lazy initializers.
 */
export type Reference<T> = ReferenceShape<NonFunctionalValue<T>>;

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
  this: NonFunctionalThis<T>,
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
  this: NonFunctionalThis<T>,
): Reference<T> {
  return createReferenceInternal<NonFunctionalValue<T>>(UNSET);
}
