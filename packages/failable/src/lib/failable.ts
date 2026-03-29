import {
  hasOwnKey,
  hasOwnPropertyValue,
  isFunction,
  isObject,
} from '@pvorona/assert';
import { notImplemented } from '@pvorona/not-implemented';
import type { ValueOf, Mutable } from './types.js';
import { FAILABLE_TAG, SUCCESS_TAG, FAILURE_TAG } from './constants.js';

export const FailableStatus = Object.freeze({
  Success: 'success',
  Failure: 'failure',
});

export type FailableStatus = ValueOf<typeof FailableStatus>;

export const NormalizedErrors = Object.freeze({
  mode: 'normalized-errors',
} as const);

export type FailableNormalizeErrorOptions = {
  readonly normalizeError: (error: unknown) => Error;
};

type FailableNormalizeErrorInput =
  | typeof NormalizedErrors
  | FailableNormalizeErrorOptions;

type Fallback<U, E> = (error: E) => U;

type Match<T, E> = <R1, R2>(
  onSuccess: (data: T) => R1,
  onFailure: (error: E) => R2
) => R1 | R2;

export type Failable<T, E> =
  | (Omit<Success<T>, 'orElse' | 'getOrElse' | 'map' | 'flatMap'> & {
      readonly orElse: <U>(fallback: Fallback<U, E>) => Success<T>;
      readonly getOrElse: <U>(fallback: Fallback<U, E>) => T;
      readonly match: Match<T, E>;
      readonly map: FailableMap<T, E>;
      readonly flatMap: FailableFlatMap<T, E>;
    })
  | (Omit<Failure<E>, 'orElse' | 'getOrElse' | 'map' | 'flatMap'> & {
      readonly orElse: <U>(fallback: Fallback<U, E>) => Success<U>;
      readonly getOrElse: <U>(fallback: Fallback<U, E>) => U;
      readonly match: Match<T, E>;
      readonly map: FailableMap<T, E>;
      readonly flatMap: FailableFlatMap<T, E>;
    });

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
 * - **receiver**: `failable(message.result)` (rehydrates into a real {@link Failable})
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
  <R1, R2>(
    onSuccess: (data: T) => R1,
    onFailure: (error: never) => R2
  ): R1;
};

type FailureMatch<E> = {
  <R1, R2>(
    onSuccess: (data: never) => R1,
    onFailure: (error: E) => R2
  ): R2;
};

type SuccessMap<T> = {
  <U>(fn: (data: T) => U): Success<U>;
};

type FailureMap<E> = {
  <U>(fn: (data: never) => U): Failure<E>;
};

type SuccessFlatMap<T> = {
  <Next>(fn: (data: T) => Success<Next>): Success<Next>;
  <E2>(fn: (data: T) => Failure<E2>): Failure<E2>;
  <Next, E2>(fn: (data: T) => Failable<Next, E2>): Failable<Next, E2>;
};

type FailureFlatMap<E> = {
  <Next, E2>(fn: (data: never) => Failable<Next, E2>): Failure<E>;
};

type FailableMap<T, E> = {
  <U>(fn: (data: T) => U): Failable<U, E>;
};

type FailableFlatMap<T, E> = {
  <Next>(fn: (data: T) => Success<Next>): Failable<Next, E>;
  <E2>(fn: (data: T) => Failure<E2>): Failure<E | E2>;
  <Next, E2>(fn: (data: T) => Success<Next> | Failure<E2>): Failable<
    Next,
    E | E2
  >;
  <Next, E2>(fn: (data: T) => Failable<Next, E2>): Failable<Next, E | E2>;
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
  readonly isFailure: false;
  readonly data: T;
  readonly error: null;
  readonly or: <U>(value: U) => Success<T>;
  readonly orElse: <U>(getValue: Fallback<U, never>) => Success<T>;
  readonly getOr: <U>(value: U) => T;
  readonly getOrElse: <U>(getValue: Fallback<U, never>) => T;
  readonly getOrThrow: (normalizeOption?: FailableNormalizeErrorInput) => T;
  readonly match: SuccessMatch<T>;
  readonly map: SuccessMap<T>;
  readonly flatMap: SuccessFlatMap<T>;
  readonly [Symbol.iterator]: () => RunIterator<T, never, Success<T>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunIterator<
    T,
    never,
    Success<T>
  >;
};

export type Failure<E> = {
  readonly status: typeof FailableStatus.Failure;
  readonly isSuccess: false;
  readonly isFailure: true;
  readonly error: E;
  readonly data: null;
  readonly or: <U>(value: U) => Success<U>;
  readonly orElse: <U>(getValue: Fallback<U, E>) => Success<U>;
  readonly getOr: <U>(value: U) => U;
  readonly getOrElse: <U>(getValue: Fallback<U, E>) => U;
  readonly getOrThrow: (normalizeOption?: FailableNormalizeErrorInput) => never;
  readonly match: FailureMatch<E>;
  readonly map: FailureMap<E>;
  readonly flatMap: FailureFlatMap<E>;
  readonly [Symbol.iterator]: () => RunIterator<never, E, Failure<E>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunIterator<
    never,
    E,
    Failure<E>
  >;
};

type InternalSuccess<T> = Omit<Success<T>, 'orElse' | 'getOrElse'> & {
  readonly [FAILABLE_TAG]: true;
  readonly [SUCCESS_TAG]: true;
  readonly orElse: <U>(getValue: Fallback<U, never>) => Success<T>;
  readonly getOrElse: <U>(getValue: Fallback<U, never>) => T;
};

type InternalFailure<E> = Omit<Failure<E>, 'orElse' | 'getOrElse'> & {
  readonly [FAILABLE_TAG]: true;
  readonly [FAILURE_TAG]: true;
  readonly orElse: <U>(getValue: Fallback<U, E>) => Success<U>;
  readonly getOrElse: <U>(getValue: Fallback<U, E>) => U;
};

const BASE_FAILABLE = {
  [FAILABLE_TAG]: true,
  isSuccess: false,
  isFailure: false,
  data: null,
  error: null,
  or: notImplemented,
  orElse: notImplemented,
  getOr: notImplemented,
  getOrElse: notImplemented,
  getOrThrow: notImplemented,
  match: notImplemented,
  map: notImplemented,
  flatMap: notImplemented,
  [Symbol.iterator]: function failableIterator(
    this: Failable<unknown, unknown>
  ) {
    return getRunIterator(this);
  },
  [Symbol.asyncIterator]: function failableAsyncIterator(
    this: Failable<unknown, unknown>
  ) {
    return getAsyncRunIterator(this);
  },
} as const;

function toThrownError(
  error: unknown,
  normalizeOption?: FailableNormalizeErrorInput
): Error {
  if (normalizeOption === undefined) {
    return normalizeUnknownError(error);
  }

  const normalizeError = resolveNormalizeError(normalizeOption);
  if (normalizeError === null) {
    return normalizeUnknownError(error);
  }

  if (error instanceof Error && isNormalizedErrorsPreset(normalizeOption)) {
    return error;
  }

  return normalizeError(error);
}

function throwNormalizedFailure(
  error: unknown,
  normalizeOption?: FailableNormalizeErrorInput
): never {
  throw toThrownError(error, normalizeOption);
}

const BASE_SUCCESS = (() => {
  const node: Mutable<InternalSuccess<unknown>> = Object.create(BASE_FAILABLE);
  node[SUCCESS_TAG] = true;
  node.status = FailableStatus.Success;
  node.isSuccess = true;
  node.or = function orSuccess() {
    return this as Success<unknown>;
  };
  node.orElse = function orElseSuccess() {
    return this as Success<unknown>;
  };
  node.getOr = function getOrSuccess() {
    return this.data;
  };
  node.getOrElse = function getOrElseSuccess() {
    return this.data;
  };
  node.getOrThrow = function getOrThrowSuccess(
    _normalizeOption?: FailableNormalizeErrorInput
  ) {
    void _normalizeOption;
    return this.data;
  };
  node.match = function matchSuccess(
    this: InternalSuccess<unknown>,
    onSuccess: (data: unknown) => unknown
  ) {
    return onSuccess(this.data);
  } as SuccessMatch<unknown>;
  node.map = function mapSuccess(
    this: InternalSuccess<unknown>,
    fn: (data: unknown) => unknown
  ) {
    return success(fn(this.data));
  } as SuccessMap<unknown>;
  node.flatMap = function flatMapSuccess(
    this: InternalSuccess<unknown>,
    fn: (data: unknown) => unknown
  ) {
    return fn(this.data);
  } as SuccessFlatMap<unknown>;
  return Object.freeze(node);
})();

const BASE_FAILURE = (() => {
  const node: Mutable<InternalFailure<unknown>> = Object.create(BASE_FAILABLE);
  node[FAILURE_TAG] = true;
  node.status = FailableStatus.Failure;
  node.isFailure = true;
  node.or = function orFailure(value) {
    return success(value);
  };
  node.orElse = function orElseFailure<U>(fallback: Fallback<U, unknown>) {
    return success(fallback(this.error));
  };
  node.getOr = function getOrFailure(value) {
    return value;
  };
  node.getOrElse = function getOrElseFailure<U>(
    fallback: Fallback<U, unknown>
  ) {
    return fallback(this.error);
  };
  node.getOrThrow = function getOrThrowFailure(
    normalizeOption?: FailableNormalizeErrorInput
  ) {
    throwNormalizedFailure(this.error, normalizeOption);
  };
  node.match = function matchFailure(
    this: InternalFailure<unknown>,
    _onSuccess: (data: unknown) => unknown,
    onFailure: (error: unknown) => unknown
  ) {
    return onFailure(this.error);
  } as FailureMatch<unknown>;
  node.map = function mapFailure(this: InternalFailure<unknown>) {
    return this;
  } as FailureMap<unknown>;
  node.flatMap = function flatMapFailure(this: InternalFailure<unknown>) {
    return this;
  } as FailureFlatMap<unknown>;
  return Object.freeze(node);
})();

/**
 * Factory + utilities for the {@link Failable} result type.
 *
 * `Failable<T, E>` is a discriminated union of:
 * - {@link Success}: `{ status: 'success', isSuccess: true, data: T, error: null }`
 * - {@link Failure}: `{ status: 'failure', isFailure: true, error: E, data: null }`
 *
 * Function-first exports:
 * - `success()` / `success(data)` / `failure()` / `failure(error)` create hydrated results.
 * - `throwIfFailure(result)` throws on failure and narrows the same result on success.
 * - `failable(...)` captures synchronous throws, async rejections, and wire shapes.
 * - `run(...)` composes existing `Failable` values with `yield* result` for hydrated
 *   values and `yield* await promisedResult` for promised sources in async builders.
 * - hydrated `Failable` values stay sync-iterable only so `run(...)` can observe
 *   `yield* result`; they are not meant to be a general-purpose collection API.
 *
 * Quick chooser:
 * - `failable(() => value)`: capture synchronous throws from throwy code.
 * - `await failable(promise)`: capture async rejections when you already hold a promise.
 * - `run(...)`: compose steps that already return `Failable`.
 * - `throwIfFailure(result, normalizeOption?)`: keep using the same `result`
 *   variable after narrowing, with optional throw-boundary normalization.
 * - `result.getOrThrow(normalizeOption?)`: unwrap the success value in
 *   expression or return position, with optional throw-boundary normalization.
 *
 * Design goals:
 * - Prefer explicit, typed results over exceptions.
 * - Provide tiny ergonomics (`or`, `getOr`, `getOrThrow`) plus a minimal top-level
 *   `throwIfFailure(result)` helper.
 * - Support transport across structured-clone boundaries via {@link FailableLike}.
 *
 * Runtime model / invariants:
 * - Instances are shallow-immutable (`Object.freeze`) and tagged with Symbols.
 * - They are NOT class instances; do not use `instanceof`. Prefer `result.isSuccess` / `result.isFailure`
 *   or the guards {@link isSuccess} / {@link isFailure}.
 * - Discriminate on `isSuccess` / `isFailure` or `status`, not on `data` / `error` nullity
 *   (`success(null)` is valid and both slots will be `null`).
 *
 * Structured-clone boundary rule (RPC, `postMessage`, `chrome.*` messaging):
 * - **sender**: `toFailableLike(result)`
 * - **receiver**: `failable(payload)` (rehydrates methods + Symbol tags)
 *
 * `failable(...)` overloads:
 * - `failable(failable)` returns the same instance (no wrapping).
 * - `failable(failableLike)` rehydrates into a real `Success` / `Failure`.
 * - `failable(() => value)` captures synchronous thrown values into `Failure` and
 *   preserves/rehydrates returned `Failable` / `FailableLike`.
 * - `failable(promise)` captures rejection values into `Failure` and preserves/rehydrates resolved
 *   `Failable` / `FailableLike`.
 * - `failable(input, NormalizedErrors)` normalizes failures into `Error` shapes while preserving
 *   existing `Error` instances unchanged.
 * - `failable(input, { normalizeError })` runs custom failure normalization for failures,
 *   including existing `Error` instances.
 *
 * Gotchas:
 * - `isFailableLike` is intentionally strict: only `{ status, data }` or `{ status, error }`
 *   with no extra enumerable keys. If you need metadata, wrap it: `{ result: failableLike, meta }`.
 * - `or(...)` and `getOr(...)` are eager (fallback is evaluated before the call). Use branching for
 *   lazy fallbacks.
 * - Without normalization options, whatever you throw/reject becomes `.error` unchanged.
 * - `getOrThrow()` and `throwIfFailure(result)` always throw `Error` values. Existing `Error`
 *   instances are preserved unchanged; other failure values use the built-in normalization rules,
 *   including values whose string coercion hooks throw.
 * - Pass `NormalizedErrors` or `{ normalizeError }` directly to `getOrThrow(...)`
 *   or `throwIfFailure(...)` when you need a specific `Error` shape at the
 *   throw boundary.
 * - Normalize earlier with `failable(...)` only when you need that `Error`
 *   shape inside the `Failure` channel before throwing.
 * - `failable(() => somePromise)` is not the supported API. In TypeScript,
 *   obviously promise-returning callbacks are rejected. JS callers, plus
 *   `any`/`unknown`-typed callbacks, receive a `Failure<Error>` telling them
 *   to pass the promise directly instead.
 *
 * @example
 * const raw = failable(() => JSON.parse(text));
 * if (raw.isSuccess) return raw.data;
 * console.error(raw.error);
 *
 * @example
 * // Structured-clone transport
 * const wire = toFailableLike(res);
 * // ... send wire ...
 * const hydrated = failable(wire);
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

export function success(): Success<void>;
export function success<const T>(data: T): Success<T>;
export function success<const T>(data?: T): Success<T | void> {
  const node: Mutable<InternalSuccess<T | void>> = Object.create(BASE_SUCCESS);
  node.data = data;
  return Object.freeze(node) as Success<T | void>;
}

export function failure(): Failure<void>;
export function failure<const E>(error: E): Failure<E>;
export function failure<const E>(error?: E): Failure<E | void> {
  const node: Mutable<InternalFailure<E | void>> = Object.create(BASE_FAILURE);
  node.error = error;
  return Object.freeze(node) as Failure<E | void>;
}

/**
 * Throw an `Error` on failure, or narrow the same result to {@link Success} on return.
 *
 * Use this when you want control-flow narrowing without replacing the original variable.
 * Use `result.getOrThrow()` when you need the success value itself in expression or return position.
 * Existing `Error` instances are thrown unchanged by default. Pass `NormalizedErrors`
 * or `{ normalizeError }` when you need a specific `Error` shape at the throw boundary.
 */
export function throwIfFailure<T, E>(
  result: Failable<T, E>,
  normalizeOption?: FailableNormalizeErrorInput
): asserts result is Success<T> {
  if (result.status === FailableStatus.Failure) {
    throwNormalizedFailure(result.error, normalizeOption);
  }
}

export function toFailableLike<T>(value: Success<T>): FailableLikeSuccess<T>;
export function toFailableLike<E>(value: Failure<E>): FailableLikeFailure<E>;
export function toFailableLike<T, E>(value: Failable<T, E>): FailableLike<T, E>;
export function toFailableLike<T, E>(
  value: Failable<T, E>
): FailableLike<T, E> {
  if (value.status === FailableStatus.Failure) {
    return { status: FailableStatus.Failure, error: value.error };
  }

  return { status: FailableStatus.Success, data: value.data };
}

type InferFailableFromValue<T, E = unknown> = [T] extends [never]
  ? Failure<E>
  : T extends Success<infer A>
  ? Success<A>
  : T extends Failure<infer A>
  ? Failure<A>
  : T extends FailableLikeSuccess<infer A>
  ? Success<A>
  : T extends FailableLikeFailure<infer A>
  ? Failure<A>
  : T extends Failable<infer A, infer B>
  ? Failable<A, B>
  : T extends FailableLike<infer A, infer B>
  ? Failable<A, B>
  : Failable<T, E>;

type IsAny<T> = 0 extends 1 & T ? true : false;

type HasKnownPromiseLikeReturn<T> = IsAny<T> extends true
  ? false
  : unknown extends T
  ? false
  : [Extract<T, PromiseLike<unknown>>] extends [never]
  ? false
  : true;

type FailableSyncOnlyCallback<F extends () => unknown> = F &
  (HasKnownPromiseLikeReturn<ReturnType<F>> extends true
    ? { readonly __failablePassPromiseDirectly: never }
    : unknown);

type InferReturnTypeFromPromise<P extends PromiseLike<unknown>, E = unknown> = [
  Awaited<P>
] extends [never]
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

type NormalizeFailableResult<T> = [T] extends [never]
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

type FailableInput =
  | FailableLike<unknown, unknown>
  | Failable<unknown, unknown>
  | (() => unknown)
  | PromiseLike<unknown>;

const ASYNC_CALLBACK_MESSAGE =
  '`failable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await failable(promise)`.';
const ASYNC_CALLBACK_ERROR_TAG = Symbol('AsyncCallbackError');

type AsyncCallbackError = Error & {
  readonly [ASYNC_CALLBACK_ERROR_TAG]: true;
};

class RunStep<T, E, TSource = Failable<T, E>> {
  public readonly source: TSource;

  private constructor(source: TSource) {
    this.source = source;
  }

  static create<T, E, TSource extends Failable<T, E>>(
    source: TSource
  ): RunStep<T, E, TSource> {
    return new RunStep<T, E, TSource>(source);
  }
}

type RunIterator<
  T,
  E,
  TSource extends Failable<T, E> = Failable<T, E>
> = Generator<RunStep<T, E, TSource>, T, unknown>;

type AsyncRunIterator<
  T,
  E,
  TSource extends Failable<T, E> = Failable<T, E>
> = AsyncGenerator<RunStep<T, E, TSource>, T, unknown>;

type RunYield = RunStep<unknown, unknown, unknown>;
type RunReturn = void | Failable<unknown, unknown>;

type InferRunYieldError<TYield> = TYield extends RunStep<
  unknown,
  infer TError,
  unknown
>
  ? TError
  : never;

type InferRunGuaranteedFailureError<TYield> = TYield extends RunStep<
  unknown,
  infer TError,
  infer TSource
>
  ? [TSource] extends [Failure<TError>]
    ? TError
    : never
  : never;

type MergeRunErrors<TYield, TError> = InferRunYieldError<TYield> | TError;

type InferRunSuccessResult<TYield, TData> = [
  InferRunYieldError<TYield>
] extends [never]
  ? Success<TData>
  : Failable<TData, InferRunYieldError<TYield>>;

type InferRunNeverSuccessResult<TYield> = [InferRunYieldError<TYield>] extends [
  never
]
  ? Success<never>
  : [InferRunGuaranteedFailureError<TYield>] extends [never]
  ? Failable<never, InferRunYieldError<TYield>>
  : Failure<InferRunYieldError<TYield>>;

type InferRunUnionReturnData<TResult> =
  | ([Extract<TResult, void>] extends [never] ? never : void)
  | (Extract<
      TResult,
      {
        readonly isSuccess: true;
        readonly data: unknown;
      }
    > extends {
      readonly data: infer TData;
    }
      ? TData
      : never);

type InferRunUnionReturnError<TResult> = Extract<
  TResult,
  {
    readonly isFailure: true;
    readonly error: unknown;
  }
> extends { readonly error: infer TError }
  ? TError
  : never;

type InferRunResult<TYield, TResult> = [TResult] extends [never]
  ? [InferRunYieldError<TYield>] extends [never]
    ? never
    : Failure<InferRunYieldError<TYield>>
  : [TResult] extends [void]
  ? InferRunSuccessResult<TYield, void>
  : [TResult] extends [Success<infer TData>]
  ? [TData] extends [never]
    ? InferRunNeverSuccessResult<TYield>
    : InferRunSuccessResult<TYield, TData>
  : [TResult] extends [Failure<infer TError>]
  ? Failure<MergeRunErrors<TYield, TError>>
  : [MergeRunErrors<TYield, InferRunUnionReturnError<TResult>>] extends [never]
  ? Success<InferRunUnionReturnData<TResult>>
  : Failable<
      InferRunUnionReturnData<TResult>,
      MergeRunErrors<TYield, InferRunUnionReturnError<TResult>>
    >;

const RUN_INVALID_YIELD_MESSAGE =
  '`run()` generators must use `yield*` only with hydrated `Failable` values. Use `yield* helper()` for sync helpers and `yield* await promisedHelper()` for promised sources.';
const RUN_INVALID_RETURN_MESSAGE =
  '`run()` generators must return a `Failable` or finish without returning a value.';

function getRunIterator<T>(
  source: Success<T>
): RunIterator<T, never, Success<T>>;
function getRunIterator<E>(
  source: Failure<E>
): RunIterator<never, E, Failure<E>>;
function getRunIterator<T, E>(
  source: Failable<T, E>
): RunIterator<T, E, Failable<T, E>>;
function* getRunIterator<T, E>(
  source: Failable<T, E>
): RunIterator<T, E, Failable<T, E>> {
  return (yield RunStep.create<T, E, Failable<T, E>>(source)) as T;
}

function getAsyncRunIterator<T>(
  source: Success<T>
): AsyncRunIterator<T, never, Success<T>>;
function getAsyncRunIterator<E>(
  source: Failure<E>
): AsyncRunIterator<never, E, Failure<E>>;
function getAsyncRunIterator<T, E>(
  source: Failable<T, E>
): AsyncRunIterator<T, E, Failable<T, E>>;
async function* getAsyncRunIterator<T, E>(
  source: Failable<T, E>
): AsyncRunIterator<T, E, Failable<T, E>> {
  return (yield RunStep.create(source)) as T;
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  if (!isObject(value) && !isFunction(value)) {
    return false;
  }

  const candidate = value as { readonly then?: unknown };
  return isFunction(candidate.then);
}

type SyncRunBuilder<
  TYield extends RunYield = never,
  TResult extends RunReturn = RunReturn
> = (_helpers: RunNoHelpers) => Generator<TYield, TResult, unknown>;

type RunNoHelpers = {
  readonly __runNoHelpers?: never;
};

const RUN_NO_HELPERS: RunNoHelpers = Object.freeze({});
type ValidateRunReturn<TResult> = [TResult] extends [RunReturn]
  ? unknown
  : { readonly __runInvalidReturn: never };

type FailableSource<T, E> = Failable<T, E> | PromiseLike<Failable<T, E>>;

/**
 * Reject obvious bare `Promise.reject(...)` inputs (`PromiseLike<never>`) while
 * preserving the caller's original tuple types for valid sources.
 */
type GuardedFailableSourceInput<T> = T extends PromiseLike<infer U>
  ? [U] extends [never]
    ? never
    : T extends PromiseLike<Failable<unknown, unknown>>
    ? T
    : never
  : T extends Failable<unknown, unknown>
  ? T
  : never;

type AllSettledSources<T extends readonly unknown[]> = {
  readonly [K in keyof T]: GuardedFailableSourceInput<T[K]>;
};

type RaceSources<T extends readonly unknown[]> = {
  readonly [K in keyof T]: GuardedFailableSourceInput<T[K]>;
};

type FailableSourceError<T> = T extends Success<unknown>
  ? never
  : T extends Failure<infer E>
  ? E
  : T extends Failable<unknown, infer E>
  ? E
  : T extends PromiseLike<Success<unknown>>
  ? never
  : T extends PromiseLike<Failure<infer E>>
  ? E
  : T extends PromiseLike<Failable<unknown, infer E>>
  ? E
  : never;

type FailableSourceData<T> = T extends Success<infer D>
  ? D
  : T extends Failure<unknown>
  ? never
  : T extends Failable<infer D, unknown>
  ? D
  : T extends PromiseLike<Success<infer D>>
  ? D
  : T extends PromiseLike<Failure<unknown>>
  ? never
  : T extends PromiseLike<Failable<infer D, unknown>>
  ? D
  : never;

type AllTupleError<T> = T extends readonly (infer P)[]
  ? FailableSourceError<P>
  : never;

type AllTupleData<T> = {
  readonly [K in keyof T]: FailableSourceData<T[K]>;
};

type FailableSourceSettled<T> = T extends Success<infer D>
  ? Success<D>
  : T extends Failure<infer E>
  ? Failure<E>
  : T extends Failable<infer D, infer E>
  ? Failable<D, E>
  : T extends PromiseLike<Success<infer D>>
  ? Success<D>
  : T extends PromiseLike<Failure<infer E>>
  ? Failure<E>
  : T extends PromiseLike<Failable<infer D, infer E>>
  ? Failable<D, E>
  : never;

type FailableSourceIsAsync<T> = [
  Extract<T, PromiseLike<Failable<unknown, unknown>>>
] extends [never]
  ? false
  : true;

type FailableSourceHasGuaranteedFailure<T> = T extends
  | Failure<unknown>
  | PromiseLike<Failure<unknown>>
  ? true
  : false;

type TupleHasAsync<T> = T extends readonly [infer First, ...infer Rest]
  ? FailableSourceIsAsync<First> extends true
    ? true
    : Rest extends readonly unknown[]
    ? TupleHasAsync<Rest>
    : false
  : false;

/** True when at least one element of T is Failure<...> or PromiseLike<Failure<...>>. */
type AllTupleHasGuaranteedFailure<T> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? FailableSourceHasGuaranteedFailure<First> extends true
    ? true
    : Rest extends readonly unknown[]
    ? AllTupleHasGuaranteedFailure<Rest>
    : false
  : false;

type AllReturnData<T> = AllTupleHasGuaranteedFailure<T> extends true
  ? never
  : AllTupleData<T>;

type AllSettledTuple<T> = {
  readonly [K in keyof T]: FailableSourceSettled<T[K]>;
};

type RaceData<T> = T extends readonly (infer P)[]
  ? FailableSourceData<P>
  : never;

type RaceError<T> = T extends readonly (infer P)[]
  ? FailableSourceError<P>
  : never;

type RaceReturn<T extends readonly unknown[]> = T extends readonly []
  ? Promise<Failable<RaceData<T>, RaceError<T>>>
  : TupleHasAsync<T> extends true
  ? Promise<Failable<RaceData<T>, RaceError<T>>>
  : Failable<RaceData<T>, RaceError<T>>;

function toValidatedFailable(source: unknown): Failable<unknown, unknown> {
  if (isFailable(source)) return source;

  return failure(source);
}

function hasPromiseLikeSources(sources: readonly unknown[]): boolean {
  for (const source of sources) {
    if (isPromiseLike(source)) return true;
  }

  return false;
}

async function resolveFailableSources(
  sources: readonly unknown[]
): Promise<readonly Failable<unknown, unknown>[]> {
  const results = await Promise.all(
    sources.map((source) => Promise.resolve(source))
  );

  return results.map((result) => toValidatedFailable(result));
}

function combineAllResults<T extends readonly unknown[]>(
  results: readonly Failable<unknown, unknown>[]
): Failable<AllReturnData<T>, AllTupleError<T>> {
  for (const result of results) {
    if (result.status === FailableStatus.Failure) {
      return result as Failure<AllTupleError<T>>;
    }
  }

  const tuple = results.map(
    (result) => (result as Success<unknown>).data
  ) as AllTupleData<T>;

  return success(tuple) as unknown as Failable<
    AllReturnData<T>,
    AllTupleError<T>
  >;
}

function combineAllSettledResults<T extends readonly unknown[]>(
  results: readonly Failable<unknown, unknown>[]
): AllSettledTuple<T> {
  return results as AllSettledTuple<T>;
}

export function all<
  const T extends readonly FailableSource<unknown, unknown>[]
>(
  ...sources: T
): TupleHasAsync<T> extends true
  ? Promise<Failable<AllReturnData<T>, AllTupleError<T>>>
  : Failable<AllReturnData<T>, AllTupleError<T>> {
  if (!hasPromiseLikeSources(sources)) {
    return combineAllResults<T>(
      sources.map((source) => toValidatedFailable(source))
    ) as TupleHasAsync<T> extends true
      ? Promise<Failable<AllReturnData<T>, AllTupleError<T>>>
      : Failable<AllReturnData<T>, AllTupleError<T>>;
  }

  return resolveFailableSources(sources).then((results) =>
    combineAllResults<T>(results)
  ) as TupleHasAsync<T> extends true
    ? Promise<Failable<AllReturnData<T>, AllTupleError<T>>>
    : Failable<AllReturnData<T>, AllTupleError<T>>;
}

/**
 * Wait for every source that resolves successfully and return a tuple of their
 * `Failable` results.
 *
 * If a source promise rejects before producing a `Failable`, the combinator
 * rejects unchanged. Wrap that boundary with `failable(...)` first if you want
 * the rejection converted into `Failure`.
 */
export function allSettled<const T extends readonly unknown[]>(
  ...sources: T & AllSettledSources<T>
): TupleHasAsync<T> extends true
  ? Promise<AllSettledTuple<T>>
  : AllSettledTuple<T> {
  if (!hasPromiseLikeSources(sources)) {
    return combineAllSettledResults<T>(
      sources.map((source) => toValidatedFailable(source))
    ) as TupleHasAsync<T> extends true
      ? Promise<AllSettledTuple<T>>
      : AllSettledTuple<T>;
  }

  return resolveFailableSources(sources).then((results) =>
    combineAllSettledResults<T>(results)
  ) as TupleHasAsync<T> extends true
    ? Promise<AllSettledTuple<T>>
    : AllSettledTuple<T>;
}

/**
 * Take the first `Failable` source to settle.
 *
 * When every source is already hydrated, the first source in input order wins
 * synchronously. When any source is promised, winner ordering follows normal
 * `Promise.race(...)` semantics for already-settled entries.
 */
export function race<const T extends readonly unknown[]>(
  ...sources: T & RaceSources<T>
): RaceReturn<T> {
  if (sources.length === 0) {
    return Promise.reject(
      new Error('`race()` requires at least one `Failable` source.')
    ) as RaceReturn<T>;
  }

  if (!hasPromiseLikeSources(sources)) {
    return toValidatedFailable(sources[0]) as RaceReturn<T>;
  }

  return Promise.race(sources.map((source) => Promise.resolve(source))).then(
    (result) =>
      toValidatedFailable(result) as Failable<RaceData<T>, RaceError<T>>
  ) as RaceReturn<T>;
}

type AsyncRunBuilder<
  TYield extends RunStep<unknown, unknown, unknown> = never,
  TResult extends RunReturn = RunReturn
> = (_helpers: RunNoHelpers) => AsyncGenerator<TYield, TResult, unknown>;

function readRunStep(yielded: unknown): RunStep<unknown, unknown, unknown> {
  if (!(yielded instanceof RunStep)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  return yielded;
}

function readRunSource(yielded: unknown): Failable<unknown, unknown> {
  const source = readRunStep(yielded).source;
  if (!isFailable(source)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  return source;
}

function finalizeRunResult<TYield, TResult extends RunReturn>(
  result: TResult
): InferRunResult<TYield, TResult> {
  if (isFailable(result)) {
    return result as InferRunResult<TYield, TResult>;
  }

  if (result === undefined) {
    return success() as InferRunResult<TYield, TResult>;
  }

  throw new Error(RUN_INVALID_RETURN_MESSAGE);
}

function isAsyncRunIterator(
  iterator: Generator<RunYield, RunReturn, unknown> | AsyncGenerator<unknown>
): iterator is AsyncGenerator<
  RunStep<unknown, unknown, unknown>,
  RunReturn,
  unknown
> {
  return Symbol.asyncIterator in iterator;
}

type RunIteration<TYield extends RunYield, TResult extends RunReturn> =
  IteratorResult<TYield, TResult>;

type SyncRunController<TYield extends RunYield, TResult extends RunReturn> = {
  readonly next: (value?: unknown) => RunIteration<TYield, TResult>;
  readonly return: (
    result: Failable<unknown, unknown>
  ) => RunIteration<TYield, TResult>;
};

type AsyncRunController<TYield extends RunYield, TResult extends RunReturn> = {
  readonly next: (value?: unknown) => Promise<RunIteration<TYield, TResult>>;
  readonly return: (
    result: Failable<unknown, unknown>
  ) => Promise<RunIteration<TYield, TResult>>;
};

function driveRunIterator<TYield extends RunYield, TResult extends RunReturn>(
  controller: SyncRunController<TYield, TResult>
): InferRunResult<TYield, TResult>;
function driveRunIterator<TYield extends RunYield, TResult extends RunReturn>(
  controller: AsyncRunController<TYield, TResult>
): Promise<InferRunResult<TYield, TResult>>;
function driveRunIterator<TYield extends RunYield, TResult extends RunReturn>(
  controller:
    | SyncRunController<TYield, TResult>
    | AsyncRunController<TYield, TResult>
): InferRunResult<TYield, TResult> | Promise<InferRunResult<TYield, TResult>> {
  const continueRun = (
    iteration: RunIteration<TYield, TResult>
  ): InferRunResult<TYield, TResult> | Promise<InferRunResult<TYield, TResult>> => {
    if (iteration.done) {
      return finalizeRunResult<TYield, TResult>(iteration.value);
    }

    const source = readRunSource(iteration.value);
    if (source.status === FailableStatus.Failure) {
      return continueClose(controller.return(source), source);
    }

    return resolveStep(controller.next(source.data), continueRun);
  };

  const continueClose = (
    step:
      | RunIteration<TYield, TResult>
      | Promise<RunIteration<TYield, TResult>>,
    unwindResult: Failable<unknown, unknown>
  ): InferRunResult<TYield, TResult> | Promise<InferRunResult<TYield, TResult>> =>
    resolveStep(step, (iteration) => {
      if (iteration.done) {
        return finalizeRunResult<TYield, TResult>(iteration.value);
      }

      const source = readRunSource(iteration.value);
      if (source.status === FailableStatus.Failure) {
        return continueClose(controller.return(unwindResult), unwindResult);
      }

      return continueClose(controller.next(source.data), unwindResult);
    });

  return resolveStep(controller.next(), continueRun);
}

function resolveStep<TStep, TResult>(
  step: TStep | Promise<TStep>,
  onResolved: (value: TStep) => TResult | Promise<TResult>
): TResult | Promise<TResult> {
  if (isPromiseLike(step)) {
    return step.then((value) => onResolved(value));
  }

  return onResolved(step);
}

export function run<
  TYield extends RunStep<unknown, unknown, unknown> = never,
  TResult = RunReturn
>(
  builder: ((
    _helpers: RunNoHelpers
  ) => AsyncGenerator<TYield, TResult, unknown>) &
    ValidateRunReturn<TResult>
): Promise<InferRunResult<TYield, Extract<TResult, RunReturn>>>;
export function run<TYield extends RunYield = never, TResult = RunReturn>(
  builder: ((_helpers: RunNoHelpers) => Generator<TYield, TResult, unknown>) &
    ValidateRunReturn<TResult>
): InferRunResult<TYield, Extract<TResult, RunReturn>>;
/**
 * Compose steps that already return `Failable`.
 *
 * Inside `run(...)` builders:
 * - sync hydrated `Failable` helpers can use direct `yield* helper()` in both sync
 *   and async builders
 * - promised sources in async builders use `yield* await promisedHelper()`
 * - in async builders, use `yield* await all(...)` to run multiple sources in
 *   parallel and get a success tuple or the first failure
 * - use `yield* all(...)` in sync builders when every source is already a hydrated
 *   `Failable`
 * - use `await allSettled(...)` to inspect the settled tuple of sources that
 *   resolve to `Failable`; source promise rejections still reject unchanged
 * - use `yield* race(...)` when every raced source is already a hydrated
 *   `Failable`
 * - use `yield* await race(...)` when any raced source is promised
 * - if a yielded step fails, that failure becomes the default unwind result
 * - cleanup still runs, and the last explicit `return` reached in `finally`
 *   wins (including bare `return;`, which becomes `success()`)
 * - yielded cleanup `Failure` values keep the current unwind result unless a
 *   later cleanup `return` overrides it
 * - direct promised sources still follow normal async `await` / `try` /
 *   `finally` semantics rather than a helper-managed rejection path
 *
 * Hydrated `Failable` values expose both sync and async iterators so `yield*` can
 * flow through the same internal step protocol in sync and async builders.
 * Outside `run(...)`, treat them as result objects rather than as a collection API.
 *
 * `run(...)` does not convert direct throws or rejected promises into `Failure`.
 */
export function run(
  builder:
    | SyncRunBuilder<RunYield, RunReturn>
    | AsyncRunBuilder<RunStep<unknown, unknown, unknown>, RunReturn>
): unknown {
  const iterator = (
    builder as (
      _helpers: RunNoHelpers
    ) =>
      | Generator<RunYield, RunReturn, unknown>
      | AsyncGenerator<RunStep<unknown, unknown, unknown>, RunReturn, unknown>
  )(RUN_NO_HELPERS);

  if (isAsyncRunIterator(iterator)) {
    return driveRunIterator({
      next: (value) => iterator.next(value),
      return: (result) => iterator.return(result as never),
    });
  }

  return driveRunIterator({
    next: (value) =>
      (iterator as Generator<RunYield, RunReturn, unknown>).next(value),
    return: (result) =>
      (iterator as Generator<RunYield, RunReturn, unknown>).return(
        result as never
      ),
  });
}

export function failable<T>(value: Success<T>): Success<T>;
export function failable<E>(value: Failure<E>): Failure<E>;
export function failable<T, E>(value: Failable<T, E>): Failable<T, E>;
export function failable<T>(value: FailableLikeSuccess<T>): Success<T>;
export function failable<E>(value: FailableLikeFailure<E>): Failure<E>;
export function failable<T, E>(value: FailableLike<T, E>): Failable<T, E>;
export function failable<T>(
  value: Success<T>,
  normalizeOption: FailableNormalizeErrorInput
): Success<T>;
export function failable<E>(
  value: Failure<E>,
  normalizeOption: FailableNormalizeErrorInput
): Failure<Error>;
export function failable<T, E>(
  value: Failable<T, E>,
  normalizeOption: FailableNormalizeErrorInput
): Failable<T, Error>;
export function failable<T>(
  value: FailableLikeSuccess<T>,
  normalizeOption: FailableNormalizeErrorInput
): Success<T>;
export function failable<E>(
  value: FailableLikeFailure<E>,
  normalizeOption: FailableNormalizeErrorInput
): Failure<Error>;
export function failable<T, E>(
  value: FailableLike<T, E>,
  normalizeOption: FailableNormalizeErrorInput
): Failable<T, Error>;
/**
 * Capture the boundary you actually have:
 * - `failable(() => value)` for synchronous callbacks that may throw
 * - `await failable(promise)` for promise-based code that may reject
 * - `run(...)` when the steps already return `Failable`
 *
 * In TypeScript, obviously promise-returning callbacks like `async () => ...` and
 * `() => Promise.resolve(...)` are rejected. JS callers, plus `any`/`unknown`-typed
 * callbacks, still rely on the runtime guard and receive a `Failure<Error>` telling
 * them to pass the promise directly instead. That guard error is preserved even when
 * a custom `normalizeError` callback is provided.
 */
export function failable<P extends PromiseLike<unknown>>(
  promise: P,
  normalizeOption: FailableNormalizeErrorInput
): Promise<NormalizeFailableResult<Awaited<P>>>;
export function failable<P extends PromiseLike<unknown>, E = unknown>(
  promise: P
): InferReturnTypeFromPromise<P, E>;
export function failable<F extends () => unknown>(
  fun: FailableSyncOnlyCallback<F>,
  normalizeOption: FailableNormalizeErrorInput
): NormalizeFailableResult<ReturnType<F>>;
export function failable<F extends () => unknown, E = unknown>(
  fun: FailableSyncOnlyCallback<F>
): InferFailableFromValue<ReturnType<F>, E>;
export function failable(
  value: FailableInput,
  normalizeOption?: FailableNormalizeErrorInput
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

function createAsyncCallbackError(): AsyncCallbackError {
  const error = new Error(ASYNC_CALLBACK_MESSAGE) as AsyncCallbackError;

  Object.defineProperty(error, ASYNC_CALLBACK_ERROR_TAG, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return error;
}

function isAsyncCallbackError(error: unknown): error is AsyncCallbackError {
  if (!(error instanceof Error)) return false;

  return (
    Object.getOwnPropertyDescriptor(error, ASYNC_CALLBACK_ERROR_TAG)?.value ===
    true
  );
}

function ignorePromiseRejection(value: PromiseLike<unknown>) {
  void Promise.resolve(value).catch(() => undefined);
}

function fromFunction<T extends () => U, E, U = ReturnType<T>>(
  fun: T,
  normalizeOption?: FailableNormalizeErrorInput
) {
  try {
    const data = fun();

    if (isPromiseLike(data)) {
      ignorePromiseRejection(data);
      return normalizeFailableResult(
        failure(createAsyncCallbackError()),
        normalizeOption
      );
    }

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

function fromPromise<T extends PromiseLike<unknown>>(
  promise: T,
  normalizeOption?: FailableNormalizeErrorInput
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
  normalizeOption?: FailableNormalizeErrorInput
) {
  if (result.status === FailableStatus.Success) return result;
  if (isAsyncCallbackError(result.error)) return result;

  const normalizeError = resolveNormalizeError(normalizeOption);
  if (normalizeError === null) return result;
  if (
    result.error instanceof Error &&
    normalizeOption !== undefined &&
    isNormalizedErrorsPreset(normalizeOption)
  ) {
    return result;
  }

  return failure(normalizeError(result.error));
}

function resolveNormalizeError(normalizeOption?: FailableNormalizeErrorInput) {
  if (normalizeOption === undefined) return null;
  if (isNormalizedErrorsPreset(normalizeOption)) return normalizeUnknownError;
  if (!isFailableNormalizeErrorOptions(normalizeOption)) return null;

  return normalizeOption.normalizeError;
}

function isNormalizedErrorsPreset(
  value: unknown
): value is typeof NormalizedErrors {
  if (!isObject(value)) return false;
  if (Object.keys(value).length !== 1) return false;

  return (
    Object.getOwnPropertyDescriptor(value, 'mode')?.value ===
    NormalizedErrors.mode
  );
}

function isFailableNormalizeErrorOptions(
  value: unknown
): value is FailableNormalizeErrorOptions {
  if (!isObject(value)) return false;

  return isFunction(value.normalizeError);
}

function isPlainObjectErrorValue(
  value: unknown
): value is Record<string | number | symbol, unknown> {
  if (!isObject(value)) return false;
  if (Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function getSerializedPlainObjectErrorMessage(
  value: Record<string | number | symbol, unknown>
): string | null {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized === 'string') return serialized;
  } catch {
    return null;
  }

  return null;
}

const UNSTRINGIFIABLE_ERROR_MESSAGE = 'Unstringifiable error value';

function tryGetStringErrorMessage(value: unknown): string | null {
  try {
    return String(value);
  } catch {
    return null;
  }
}

function tryGetObjectTagErrorMessage(value: object): string | null {
  try {
    return Object.prototype.toString.call(value);
  } catch {
    return null;
  }
}

function getPlainObjectErrorMessage(
  value: Record<string | number | symbol, unknown>
): string {
  if (Object.getPrototypeOf(value) === null) {
    const serializedMessage = getSerializedPlainObjectErrorMessage(value);
    if (serializedMessage !== null) return serializedMessage;

    return tryGetObjectTagErrorMessage(value) ?? UNSTRINGIFIABLE_ERROR_MESSAGE;
  }

  const message = tryGetStringErrorMessage(value);
  if (message !== null && message !== '[object Object]') return message;

  const serializedMessage = getSerializedPlainObjectErrorMessage(value);
  if (serializedMessage !== null) return serializedMessage;

  return message ?? UNSTRINGIFIABLE_ERROR_MESSAGE;
}

function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (Array.isArray(error)) {
    return new AggregateError(error, 'Multiple errors', { cause: error });
  }

  if (isPlainObjectErrorValue(error)) {
    return new Error(getPlainObjectErrorMessage(error), { cause: error });
  }

  return new Error(
    tryGetStringErrorMessage(error) ?? UNSTRINGIFIABLE_ERROR_MESSAGE,
    { cause: error }
  );
}
