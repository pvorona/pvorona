import { isFunction, isObject, type Mutable } from '@pvorona/assert';
import { notImplemented } from '@pvorona/not-implemented';

const FAILABLE_TAG = Symbol('Failable');
const SUCCESS_TAG = Symbol('Success');
const FAILURE_TAG = Symbol('Failure');

export const enum FailableStatus {
  Success = 'success',
  Failure = 'failure',
}

export type Failable<T, E> = Success<T> | Failure<E>;

/**
 * Structured-clone-friendly representation of {@link Failable}.
 *
 * Use this when sending a result across context boundaries like:
 * - `window.postMessage` / `MessagePort`
 * - `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`
 *
 * A {@link Failable} instance relies on Symbols and prototype methods, which do not survive structured cloning.
 *
 * Boundary rule:
 * - **sender**: `toFailableLike(result)`
 * - **receiver**: `createFailable(message.result)` (rehydrates into a real {@link Failable})
 *
 * Note: `data` / `error` must themselves be structured-cloneable.
 */
export type FailableLike<T, E> =
  | FailableLikeSuccess<T>
  | FailableLikeFailure<E>;

export type FailableLikeSuccess<T> = {
  readonly status: FailableStatus.Success;
  readonly data: T;
};

export type FailableLikeFailure<E> = {
  readonly status: FailableStatus.Failure;
  readonly error: E;
};

function isFailableLikeSuccess(
  value: unknown
): value is FailableLikeSuccess<unknown> {
  return (
    isObject(value) &&
    Object.keys(value).length === 2 &&
    Object.getOwnPropertyDescriptor(value, 'status')?.value ===
      FailableStatus.Success &&
    Object.prototype.hasOwnProperty.call(value, 'data')
  );
}

function isFailableLikeFailure(
  value: unknown
): value is FailableLikeFailure<unknown> {
  return (
    isObject(value) &&
    Object.keys(value).length === 2 &&
    Object.getOwnPropertyDescriptor(value, 'status')?.value ===
      FailableStatus.Failure &&
    Object.prototype.hasOwnProperty.call(value, 'error')
  );
}

export function isFailableLike(
  value: unknown
): value is FailableLike<unknown, unknown> {
  return isFailableLikeFailure(value) || isFailableLikeSuccess(value);
}

export type Success<T> = {
  readonly status: FailableStatus.Success;
  readonly isSuccess: true;
  readonly isError: false;
  readonly data: T;
  readonly error: null;
  readonly or: <U>(value: U) => Success<T>;
  readonly getOr: <U>(value: U) => T;
  readonly getOrThrow: () => T;
};

export type Failure<E> = {
  readonly status: FailableStatus.Failure;
  readonly isSuccess: false;
  readonly isError: true;
  readonly error: E;
  readonly data: null;
  readonly or: <U>(value: U) => Success<U>;
  readonly getOr: <U>(value: U) => U;
  readonly getOrThrow: () => never;
};

type InternalSuccess<T> = Success<T> & {
  readonly [FAILABLE_TAG]: true;
  readonly [SUCCESS_TAG]: true;
};

type InternalFailure<E> = Failure<E> & {
  readonly [FAILABLE_TAG]: true;
  readonly [FAILURE_TAG]: true;
};

const BASE_FAILABLE = {
  [FAILABLE_TAG]: true,
  isSuccess: false,
  isError: false,
  data: null,
  error: null,
  or: notImplemented,
  getOr: notImplemented,
  getOrThrow: notImplemented,
} as const;

const BASE_SUCCESS = (() => {
  const node: Mutable<InternalSuccess<unknown>> = Object.create(BASE_FAILABLE);
  node[SUCCESS_TAG] = true;
  node.status = FailableStatus.Success;
  node.isSuccess = true;
  node.or = function orSuccess() {
    return this;
  };
  node.getOr = function getOrSuccess() {
    return this.data;
  };
  node.getOrThrow = function getOrThrowSuccess() {
    return this.data;
  };
  return Object.freeze(node);
})();

const BASE_FAILURE = (() => {
  const node: Mutable<InternalFailure<unknown>> = Object.create(BASE_FAILABLE);
  node[FAILURE_TAG] = true;
  node.status = FailableStatus.Failure;
  node.isError = true;
  node.or = function orFailure(value) {
    return success(value);
  };
  node.getOr = function getOrFailure(value) {
    return value;
  };
  node.getOrThrow = function getOrThrowFailure() {
    throw this.error;
  };
  return Object.freeze(node);
})();

/**
 * Factory + utilities for the {@link Failable} result type.
 *
 * `Failable<T, E>` is a discriminated union of:
 * - {@link Success}: `{ status: 'success', isSuccess: true, data: T, error: null }`
 * - {@link Failure}: `{ status: 'failure', isError: true, error: E, data: null }`
 *
 * Design goals:
 * - Prefer explicit, typed results over exceptions.
 * - Provide tiny ergonomics (`or`, `getOr`, `getOrThrow`) with minimal allocation.
 * - Support transport across structured-clone boundaries via {@link FailableLike}.
 *
 * Runtime model / invariants:
 * - Instances are shallow-immutable (`Object.freeze`) and tagged with Symbols.
 * - They are NOT class instances; do not use `instanceof`. Prefer `result.isSuccess` / `result.isError`
 *   or the guards {@link isSuccess} / {@link isFailure}.
 * - Exactly one of `data` / `error` is non-null.
 *
 * Structured-clone boundary rule (RPC, `postMessage`, `chrome.*` messaging):
 * - **sender**: `toFailableLike(result)`
 * - **receiver**: `createFailable(payload)` (rehydrates methods + Symbol tags)
 *
 * `createFailable(...)` overloads:
 * - `createFailable(failable)` returns the same instance (no wrapping).
 * - `createFailable(failableLike)` rehydrates into a real `Success` / `Failure`.
 * - `createFailable(() => value)` captures thrown values into `Failure` and preserves/rehydrates returned
 *   `Failable` / `FailableLike`.
 * - `createFailable(promise)` captures rejection values into `Failure` and preserves/rehydrates resolved
 *   `Failable` / `FailableLike`.
 *
 * Gotchas:
 * - `isFailableLike` is intentionally strict: only `{ status, data }` or `{ status, error }`
 *   with no extra enumerable keys. If you need metadata, wrap it: `{ result: failableLike, meta }`.
 * - `or(...)` and `getOr(...)` are eager (fallback is evaluated before the call). Use branching for
 *   lazy fallbacks.
 * - No error normalization is performed: whatever you throw/reject becomes `.error`.
 * - `createFailable(() => somePromise)` does NOT await; pass the promise directly: `createFailable(somePromise)`.
 *
 * @example
 * const res = createFailable(() => JSON.parse(text));
 * if (res.isSuccess) return res.data;
 * console.error(res.error);
 *
 * @example
 * // Structured-clone transport
 * const wire = toFailableLike(res);
 * // ... send wire ...
 * const hydrated = createFailable(wire);
 */
function isPublicSuccessShape(value: unknown): value is Success<unknown> {
  if (!isObject(value)) return false;
  if (value.status !== FailableStatus.Success) return false;
  if (value.isSuccess !== true) return false;
  if (value.isError !== false) return false;
  if (!('data' in value)) return false;
  if (value.error !== null) return false;
  if (!isFunction(value.or)) return false;
  if (!isFunction(value.getOr)) return false;
  if (!isFunction(value.getOrThrow)) return false;

  return true;
}

function isPublicFailureShape(value: unknown): value is Failure<unknown> {
  if (!isObject(value)) return false;
  if (value.status !== FailableStatus.Failure) return false;
  if (value.isSuccess !== false) return false;
  if (value.isError !== true) return false;
  if (!('error' in value)) return false;
  if (value.data !== null) return false;
  if (!isFunction(value.or)) return false;
  if (!isFunction(value.getOr)) return false;
  if (!isFunction(value.getOrThrow)) return false;

  return true;
}

export function isFailable(
  value: unknown
): value is Failable<unknown, unknown> {
  return isPublicFailureShape(value) || isPublicSuccessShape(value);
}

export function isSuccess(value: unknown): value is Success<unknown> {
  return isPublicSuccessShape(value);
}

export function isFailure(value: unknown): value is Failure<unknown> {
  return isPublicFailureShape(value);
}

export function success<T = void>(data: T): Success<T> {
  const node: Mutable<InternalSuccess<T>> = Object.create(BASE_SUCCESS);
  node.data = data;
  return Object.freeze(node);
}

export function failure<E = void>(error: E): Failure<E> {
  const node: Mutable<InternalFailure<E>> = Object.create(BASE_FAILURE);
  node.error = error;
  return Object.freeze(node);
}

export function toFailableLike<T>(value: Success<T>): FailableLikeSuccess<T>;
export function toFailableLike<E>(value: Failure<E>): FailableLikeFailure<E>;
export function toFailableLike<T, E>(value: Failable<T, E>): FailableLike<T, E>;
export function toFailableLike<T, E>(value: Failable<T, E>): FailableLike<T, E> {
  if (value.status === FailableStatus.Failure) {
    return { status: FailableStatus.Failure, error: value.error };
  }

  return { status: FailableStatus.Success, data: value.data };
}

type InferReturnTypeFromFunction<
  F extends () => R,
  E = Error,
  R = ReturnType<F>
> = [R] extends [never]
  ? Failure<E>
  : R extends Success<infer A>
  ? Success<A>
  : R extends Failure<infer A>
  ? Failure<A>
  : R extends FailableLikeSuccess<infer A>
  ? Success<A>
  : R extends FailableLikeFailure<infer A>
  ? Failure<A>
  : R extends Failable<infer A, infer B>
  ? Failable<A, B>
  : Failable<R, E>;

type InferReturnTypeFromPromise<
  T,
  E = Error,
  P extends PromiseLike<T> = PromiseLike<T>
> = [Awaited<P>] extends [never]
  ? Promise<Failure<E>>
  : Awaited<P> extends Promise<Success<infer A>>
  ? Promise<Success<A>>
  : Awaited<P> extends Promise<Failure<infer A>>
  ? Promise<Failure<A>>
  : Awaited<P> extends Failable<unknown, unknown>
  ? Promise<Awaited<P>>
  : Awaited<P> extends FailableLikeSuccess<infer A>
  ? Promise<Success<A>>
  : Awaited<P> extends FailableLikeFailure<infer A>
  ? Promise<Failure<A>>
  : Awaited<P> extends FailableLike<infer A, infer B>
  ? Promise<Failable<A, B>>
  : Promise<Failable<Awaited<P>, E>>;

export function createFailable<T>(value: FailableLikeSuccess<T>): Success<T>;
export function createFailable<E>(value: FailableLikeFailure<E>): Failure<E>;
export function createFailable<T, E>(value: FailableLike<T, E>): Failable<T, E>;
export function createFailable<F extends () => R, E = Error, R = ReturnType<F>>(
  fun: F
): InferReturnTypeFromFunction<F, E, R>;
export function createFailable<
  T,
  E = Error,
  P extends PromiseLike<T> = PromiseLike<T>
>(
  promise: P
): InferReturnTypeFromPromise<T, E, P>;
export function createFailable(
  value:
    | FailableLike<unknown, unknown>
    | Failable<unknown, unknown>
    | (() => unknown)
    | PromiseLike<unknown>
) {
  if (isFailable(value)) {
    return value;
  }

  if (isFailableLike(value)) {
    return fromFailableLike(value);
  }

  if (isFunction(value)) {
    return fromFunction(value);
  }

  return fromPromise(value);
}

function fromFailableLike<T, E>(
  failableLike: FailableLike<T, E>
): Failable<T, E> {
  if (failableLike.status === FailableStatus.Success) {
    return success(failableLike.data);
  }

  return failure(failableLike.error);
}

function fromFunction<T extends () => U, E, U = ReturnType<T>>(fun: T) {
  try {
    const data = fun();

    if (isFailable(data)) {
      return data;
    }

    if (isFailableLike(data)) {
      return fromFailableLike(data);
    }

    return success(data);
  } catch (error) {
    return failure(error as E);
  }
}

function fromPromise<T extends PromiseLike<U>, U = Awaited<T>>(promise: T) {
  return Promise.resolve(promise).then((data) => {
    if (isFailable(data)) {
      return data;
    }

    if (isFailableLike(data)) {
      return fromFailableLike(data);
    }

    return success(data);
  }, failure);
}
