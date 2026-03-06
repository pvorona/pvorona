import { assert, isFunction } from '@pvorona/assert';

const UNSET: unique symbol = Symbol('UNSET');

/* eslint-disable @typescript-eslint/no-unsafe-function-type */
type FunctionValue = Function;
/* eslint-enable @typescript-eslint/no-unsafe-function-type */

type MessageOrFactory = string | (() => string);

type NonFunctionalValue<T> = Extract<T, FunctionValue> extends never ? T : never;

type Getter<T> = () => T;

type ValueOrGetter<T> = T | Getter<T>;

type NonFunctionalReferenceGuard<T> = [T] extends [never]
  ? []
  : Extract<T, FunctionValue> extends never
    ? []
    : ['Reference values cannot be functions'];

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

export type ReadonlyReference<T> = ReadonlyReferenceShape<NonFunctionalValue<T>>;

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

export function createReference<T>(
  initialValue: T,
  ..._guard: NonFunctionalReferenceGuard<T>
): Reference<T> {
  assertNonFunctionalValue(initialValue);

  return createReferenceInternal<NonFunctionalValue<T>>(initialValue);
}

export function createUnsetReference<T>(
  ..._guard: NonFunctionalReferenceGuard<T>
): Reference<T> {
  return createReferenceInternal<NonFunctionalValue<T>>(UNSET);
}
