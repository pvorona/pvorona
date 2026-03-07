import {
  hasOwnKey,
  hasOwnPropertyValue,
  isFunction,
  isObject,
} from '@pvorona/assert';
import { notImplemented } from '@pvorona/not-implemented';
import type { Mutable } from '@pvorona/types';

const FAILABLE_TAG = Symbol('Failable');
const SUCCESS_TAG = Symbol('Success');
const FAILURE_TAG = Symbol('Failure');

export const FailableStatus = Object.freeze({
  Success: 'success',
  Failure: 'failure',
} as const);

export type FailableStatus =
  (typeof FailableStatus)[keyof typeof FailableStatus];

export const NormalizedErrors = Object.freeze({
  mode: 'normalized-errors',
} as const);

export type CreateFailableNormalizeErrorOptions = {
  readonly normalizeError: (error: unknown) => Error;
};

type CreateFailableNormalizeErrorInput =
  | typeof NormalizedErrors
  | CreateFailableNormalizeErrorOptions;

type Match<T, E> = <U>(
  onSuccess: (data: T) => U,
  onFailure: (error: E) => U
) => U;

export type Failable<T, E> =
  | (Success<T> & { readonly match: Match<T, E> })
  | (Failure<E> & { readonly match: Match<T, E> });

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
  readonly status: typeof FailableStatus.Success;
  readonly data: T;
};

export type FailableLikeFailure<E> = {
  readonly status: typeof FailableStatus.Failure;
  readonly error: E;
};

type SuccessMatch<T> = {
  <U, E>(onSuccess: (data: T) => U, onFailure: (error: E) => U): U;
};

type FailureMatch<E> = {
  <U, T>(onSuccess: (data: T) => U, onFailure: (error: E) => U): U;
};

function isFailableLikeSuccess(
  value: unknown
): value is FailableLikeSuccess<unknown> {
  return (
    isObject(value) &&
    Object.keys(value).length === 2 &&
    hasOwnPropertyValue(value, 'status', FailableStatus.Success) &&
    hasOwnKey(value, 'data')
  );
}

function isFailableLikeFailure(
  value: unknown
): value is FailableLikeFailure<unknown> {
  return (
    isObject(value) &&
    Object.keys(value).length === 2 &&
    hasOwnPropertyValue(value, 'status', FailableStatus.Failure) &&
    hasOwnKey(value, 'error')
  );
}

export function isFailableLike(
  value: unknown
): value is FailableLike<unknown, unknown> {
  return isFailableLikeFailure(value) || isFailableLikeSuccess(value);
}

export type Success<T> = {
  readonly status: typeof FailableStatus.Success;
  readonly isSuccess: true;
  readonly isError: false;
  readonly data: T;
  readonly error: null;
  readonly or: <U>(value: U) => Success<T>;
  readonly orElse: <U>(getValue: () => U) => Success<T>;
  readonly getOr: <U>(value: U) => T;
  readonly getOrElse: <U>(getValue: () => U) => T;
  readonly getOrThrow: () => T;
  readonly match: SuccessMatch<T>;
};

export type Failure<E> = {
  readonly status: typeof FailableStatus.Failure;
  readonly isSuccess: false;
  readonly isError: true;
  readonly error: E;
  readonly data: null;
  readonly or: <U>(value: U) => Success<U>;
  readonly orElse: <U>(getValue: () => U) => Success<U>;
  readonly getOr: <U>(value: U) => U;
  readonly getOrElse: <U>(getValue: () => U) => U;
  readonly getOrThrow: () => never;
  readonly match: FailureMatch<E>;
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
  orElse: notImplemented,
  getOr: notImplemented,
  getOrElse: notImplemented,
  getOrThrow: notImplemented,
  match: notImplemented,
} as const;

const BASE_SUCCESS = (() => {
  const node: Mutable<InternalSuccess<unknown>> = Object.create(BASE_FAILABLE);
  node[SUCCESS_TAG] = true;
  node.status = FailableStatus.Success;
  node.isSuccess = true;
  node.or = function orSuccess() {
    return this;
  };
  node.orElse = function orElseSuccess() {
    return this;
  };
  node.getOr = function getOrSuccess() {
    return this.data;
  };
  node.getOrElse = function getOrElseSuccess() {
    return this.data;
  };
  node.getOrThrow = function getOrThrowSuccess() {
    return this.data;
  };
  node.match = function matchSuccess(
    this: InternalSuccess<unknown>,
    onSuccess: (data: unknown) => unknown
  ) {
    return onSuccess(this.data);
  } as SuccessMatch<unknown>;
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
  node.orElse = function orElseFailure(getValue) {
    return success(getValue());
  };
  node.getOr = function getOrFailure(value) {
    return value;
  };
  node.getOrElse = function getOrElseFailure(getValue) {
    return getValue();
  };
  node.getOrThrow = function getOrThrowFailure() {
    throw this.error;
  };
  node.match = function matchFailure(
    this: InternalFailure<unknown>,
    _onSuccess: (data: unknown) => unknown,
    onFailure: (error: unknown) => unknown
  ) {
    return onFailure(this.error);
  } as FailureMatch<unknown>;
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
 * - `createFailable(input, NormalizedErrors)` normalizes non-`Error` failures into `Error` shapes.
 * - `createFailable(input, { normalizeError })` uses custom failure normalization when needed.
 *
 * Gotchas:
 * - `isFailableLike` is intentionally strict: only `{ status, data }` or `{ status, error }`
 *   with no extra enumerable keys. If you need metadata, wrap it: `{ result: failableLike, meta }`.
 * - `or(...)` and `getOr(...)` are eager (fallback is evaluated before the call). Use branching for
 *   lazy fallbacks.
 * - Without normalization options, whatever you throw/reject becomes `.error` unchanged.
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
function hasInternalTag<Tag extends symbol>(
  value: unknown,
  tag: Tag
): value is { readonly [Key in Tag]: true } {
  if (!isObject(value)) return false;

  return value[tag] === true;
}

export function isFailable(
  value: unknown
): value is Failable<unknown, unknown> {
  return hasInternalTag(value, FAILABLE_TAG);
}

export function isSuccess(value: unknown): value is Success<unknown> {
  return hasInternalTag(value, SUCCESS_TAG);
}

export function isFailure(value: unknown): value is Failure<unknown> {
  return hasInternalTag(value, FAILURE_TAG);
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
  E = unknown,
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
  : R extends FailableLike<infer A, infer B>
  ? Failable<A, B>
  : Failable<R, E>;

type InferReturnTypeFromPromise<
  T,
  E = unknown,
  P extends PromiseLike<T> = PromiseLike<T>
> = [Awaited<P>] extends [never]
  ? Promise<Failure<E>>
  : Awaited<P> extends Success<infer A>
  ? Promise<Success<A>>
  : Awaited<P> extends Failure<infer A>
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

type NormalizeCreateFailableResult<T> = [T] extends [never]
  ? Failure<Error>
  : T extends Success<infer A>
  ? Success<A>
  : T extends Failure<unknown>
  ? Failure<Error>
  : T extends FailableLikeSuccess<infer A>
  ? Success<A>
  : T extends FailableLikeFailure<unknown>
  ? Failure<Error>
  : T extends Failable<infer A, unknown>
  ? Failable<A, Error>
  : T extends FailableLike<infer A, unknown>
  ? Failable<A, Error>
  : Failable<T, Error>;

type CreateFailableInput =
  | FailableLike<unknown, unknown>
  | Failable<unknown, unknown>
  | (() => unknown)
  | PromiseLike<unknown>;

export function createFailable<T>(value: Success<T>): Success<T>;
export function createFailable<E>(value: Failure<E>): Failure<E>;
export function createFailable<T, E>(value: Failable<T, E>): Failable<T, E>;
export function createFailable<T>(value: FailableLikeSuccess<T>): Success<T>;
export function createFailable<E>(value: FailableLikeFailure<E>): Failure<E>;
export function createFailable<T, E>(value: FailableLike<T, E>): Failable<T, E>;
export function createFailable<T>(
  value: Success<T>,
  normalizeOption: CreateFailableNormalizeErrorInput
): Success<T>;
export function createFailable<E>(
  value: Failure<E>,
  normalizeOption: CreateFailableNormalizeErrorInput
): Failure<Error>;
export function createFailable<T, E>(
  value: Failable<T, E>,
  normalizeOption: CreateFailableNormalizeErrorInput
): Failable<T, Error>;
export function createFailable<T>(
  value: FailableLikeSuccess<T>,
  normalizeOption: CreateFailableNormalizeErrorInput
): Success<T>;
export function createFailable<E>(
  value: FailableLikeFailure<E>,
  normalizeOption: CreateFailableNormalizeErrorInput
): Failure<Error>;
export function createFailable<T, E>(
  value: FailableLike<T, E>,
  normalizeOption: CreateFailableNormalizeErrorInput
): Failable<T, Error>;
export function createFailable<
  F extends () => R,
  E = unknown,
  R = ReturnType<F>
>(fun: F): InferReturnTypeFromFunction<F, E, R>;
export function createFailable<F extends () => R, R = ReturnType<F>>(
  fun: F,
  normalizeOption: CreateFailableNormalizeErrorInput
): NormalizeCreateFailableResult<R>;
export function createFailable<
  T,
  E = unknown,
  P extends PromiseLike<T> = PromiseLike<T>
>(promise: P): InferReturnTypeFromPromise<T, E, P>;
export function createFailable<T, P extends PromiseLike<T> = PromiseLike<T>>(
  promise: P,
  normalizeOption: CreateFailableNormalizeErrorInput
): Promise<NormalizeCreateFailableResult<Awaited<P>>>;
export function createFailable(
  value: CreateFailableInput,
  normalizeOption?: CreateFailableNormalizeErrorInput
) {
  if (isFailable(value)) {
    return normalizeFailableResult(value, normalizeOption);
  }

  if (isFailableLike(value)) {
    return normalizeFailableResult(fromFailableLike(value), normalizeOption);
  }

  if (isFunction(value)) {
    return fromFunction(value, normalizeOption);
  }

  return fromPromise(value, normalizeOption);
}

function fromFailableLike<T, E>(
  failableLike: FailableLike<T, E>
): Failable<T, E> {
  if (failableLike.status === FailableStatus.Success) {
    return success(failableLike.data);
  }

  return failure(failableLike.error);
}

function fromFunction<T extends () => U, E, U = ReturnType<T>>(
  fun: T,
  normalizeOption?: CreateFailableNormalizeErrorInput
) {
  try {
    const data = fun();

    if (isFailable(data)) {
      return normalizeFailableResult(data, normalizeOption);
    }

    if (isFailableLike(data)) {
      return normalizeFailableResult(fromFailableLike(data), normalizeOption);
    }

    return success(data);
  } catch (error) {
    return normalizeFailableResult(failure(error as E), normalizeOption);
  }
}

function fromPromise<T extends PromiseLike<U>, U = Awaited<T>>(
  promise: T,
  normalizeOption?: CreateFailableNormalizeErrorInput
) {
  return Promise.resolve(promise).then(
    (data) => {
      if (isFailable(data)) {
        return normalizeFailableResult(data, normalizeOption);
      }

      if (isFailableLike(data)) {
        return normalizeFailableResult(fromFailableLike(data), normalizeOption);
      }

      return success(data);
    },
    (error) => normalizeFailableResult(failure(error), normalizeOption)
  );
}

function normalizeFailableResult<T, E>(
  result: Failable<T, E>,
  normalizeOption?: CreateFailableNormalizeErrorInput
) {
  const normalizeError = resolveNormalizeError(normalizeOption);
  if (normalizeError === null) return result;
  if (result.status === FailableStatus.Success) return result;
  if (result.error instanceof Error) return result;

  return failure(normalizeError(result.error));
}

function resolveNormalizeError(
  normalizeOption?: CreateFailableNormalizeErrorInput
) {
  if (normalizeOption === undefined) return null;
  if (isNormalizedErrorsPreset(normalizeOption)) return normalizeUnknownError;
  if (!isCreateFailableNormalizeErrorOptions(normalizeOption)) return null;

  return normalizeOption.normalizeError;
}

function isNormalizedErrorsPreset(
  value: unknown
): value is typeof NormalizedErrors {
  if (!isObject(value)) return false;
  if (Object.keys(value).length !== 1) return false;

  return Object.getOwnPropertyDescriptor(value, 'mode')?.value ===
    NormalizedErrors.mode;
}

function isCreateFailableNormalizeErrorOptions(
  value: unknown
): value is CreateFailableNormalizeErrorOptions {
  if (!isObject(value)) return false;

  return isFunction(value.normalizeError);
}

function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (Array.isArray(error)) {
    return new AggregateError(error, 'Multiple errors', { cause: error });
  }

  return new Error(String(error), { cause: error });
}
