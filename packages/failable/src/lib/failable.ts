import {
  hasOwnKey,
  hasOwnPropertyValue,
  isFunction,
  isObject,
} from '@pvorona/assert';
import { notImplemented } from '@pvorona/not-implemented';
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

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

export type FailableNormalizeErrorOptions = {
  readonly normalizeError: (error: unknown) => Error;
};

type FailableNormalizeErrorInput =
  | typeof NormalizedErrors
  | FailableNormalizeErrorOptions;

type LazyFallback<U, E> = (() => U) | ((error: E) => U);

type Match<T, E> = <U>(
  onSuccess: (data: T) => U,
  onFailure: (error: E) => U
) => U;

/**
 * Hydrated `Failable` values are sync-iterable only so `run(...)` can intercept
 * `yield* result` through its existing step protocol.
 *
 * Outside `run(...)`, treat them as result objects rather than as a
 * general-purpose collection API.
 */
export type Failable<T, E> =
  | (Omit<Success<T>, 'orElse' | 'getOrElse' | 'map' | 'flatMap'> & {
      readonly orElse: <U>(getValue: LazyFallback<U, E>) => Success<T>;
      readonly getOrElse: <U>(getValue: LazyFallback<U, E>) => T;
      readonly match: Match<T, E>;
      readonly map: FailableMap<T, E>;
      readonly flatMap: FailableFlatMap<T, E>;
    })
  | (Omit<Failure<E>, 'orElse' | 'getOrElse' | 'map' | 'flatMap'> & {
      readonly orElse: <U>(getValue: LazyFallback<U, E>) => Success<U>;
      readonly getOrElse: <U>(getValue: LazyFallback<U, E>) => U;
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
  <U>(onSuccess: (data: T) => U, onFailure: (error: never) => U): U;
};

type FailureMatch<E> = {
  <U>(onSuccess: (data: never) => U, onFailure: (error: E) => U): U;
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
  <Next, E2>(
    fn: (data: T) => Success<Next> | Failure<E2>
  ): Failable<Next, E | E2>;
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
  readonly orElse: <U>(getValue: LazyFallback<U, never>) => Success<T>;
  readonly getOr: <U>(value: U) => T;
  readonly getOrElse: <U>(getValue: LazyFallback<U, never>) => T;
  readonly getOrThrow: () => T;
  readonly match: SuccessMatch<T>;
  readonly map: SuccessMap<T>;
  readonly flatMap: SuccessFlatMap<T>;
  readonly [Symbol.iterator]: () => RunGetIterator<T, never, Success<T>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunGetIterator<
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
  readonly orElse: <U>(getValue: LazyFallback<U, E>) => Success<U>;
  readonly getOr: <U>(value: U) => U;
  readonly getOrElse: <U>(getValue: LazyFallback<U, E>) => U;
  readonly getOrThrow: () => never;
  readonly match: FailureMatch<E>;
  readonly map: FailureMap<E>;
  readonly flatMap: FailureFlatMap<E>;
  readonly [Symbol.iterator]: () => RunGetIterator<never, E, Failure<E>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunGetIterator<
    never,
    E,
    Failure<E>
  >;
};

type InternalSuccess<T> = Omit<Success<T>, 'orElse' | 'getOrElse'> & {
  readonly [FAILABLE_TAG]: true;
  readonly [SUCCESS_TAG]: true;
  readonly orElse: <U>(getValue: () => U) => Success<T>;
  readonly getOrElse: <U>(getValue: () => U) => T;
};

type InternalFailure<E> = Omit<Failure<E>, 'orElse' | 'getOrElse'> & {
  readonly [FAILABLE_TAG]: true;
  readonly [FAILURE_TAG]: true;
  readonly orElse: <U>(getValue: () => U) => Success<U>;
  readonly getOrElse: <U>(getValue: () => U) => U;
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

function resolveLazyFallback<U, E>(getValue: () => U, error: E): U {
  return (getValue as unknown as (error: E) => U)(error);
}

function throwNormalizedFailure(error: unknown): never {
  throw normalizeUnknownError(error);
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
  node.getOrThrow = function getOrThrowSuccess() {
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
  node.orElse = function orElseFailure<U>(getValue: () => U) {
    return success(resolveLazyFallback(getValue, this.error));
  };
  node.getOr = function getOrFailure(value) {
    return value;
  };
  node.getOrElse = function getOrElseFailure<U>(getValue: () => U) {
    return resolveLazyFallback(getValue, this.error);
  };
  node.getOrThrow = function getOrThrowFailure() {
    throwNormalizedFailure(this.error);
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
 *   values and `yield* get(source)` when the helper is still needed.
 * - hydrated `Failable` values stay sync-iterable only so `run(...)` can observe
 *   `yield* result`; they are not meant to be a general-purpose collection API.
 *
 * Quick chooser:
 * - `failable(() => value)`: capture synchronous throws when the callback is typed as sync-only.
 * - `await failable(async () => value)` / `await failable(() => promise)`: purely async callbacks.
 * - `await Promise.resolve(failable(...))`: when the callback may be sync or async (`any`, `unknown`,
 *   or `T | Promise<T>`).
 * - `await failable(promise)`: capture async rejections when you already hold a promise.
 * - `run(...)`: compose steps that already return `Failable`.
 * - `throwIfFailure(result)`: keep using the same `result` variable after narrowing.
 * - `result.getOrThrow()`: unwrap the success value in expression or return position.
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
 *   instances are preserved unchanged; other failure values use the built-in normalization rules.
 * - Normalize earlier with `failable(..., NormalizedErrors)` or a custom `normalizeError`
 *   if you need a specific `Error` shape before the throw boundary.
 * - Callback typing follows runtime branches: purely synchronous callbacks return `Failable<...>`;
 *   purely `PromiseLike`-returning callbacks (including `async` functions) return
 *   `Promise<Failable<...>>`.
 * - If the static return type may be sync **or** `PromiseLike` (for example `T | Promise<T>`,
 *   `unknown`, or `any`), the result type is a **union** of `Failable<...>` and
 *   `Promise<Failable<...>>` so callers cannot assume promise-only APIs like `.then`.
 *   Normalize with `await Promise.resolve(result)` when you want a single `Promise`.
 *
 * @example
 * // `JSON.parse` is typed as `any`, so the callback form is a `Failable | Promise<Failable>` union.
 * const raw = await Promise.resolve(failable(() => JSON.parse(text)));
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
 * Existing `Error` instances are thrown unchanged. Other failure values are normalized with the
 * built-in rules. Normalize earlier with `failable(...)` when you need a specific `Error` shape.
 */
export function throwIfFailure<T, E>(
  result: Failable<T, E>
): asserts result is Success<T> {
  if (result.status === FailableStatus.Failure) {
    throwNormalizedFailure(result.error);
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

type IsNever<T> = [T] extends [never] ? true : false;

/**
 * `unknown` as a return type (but not `any`, which is handled separately).
 */
type IsUnknownNotAny<T> = IsAny<T> extends true
  ? false
  : [unknown] extends [T]
  ? [T] extends [unknown]
    ? true
    : false
  : false;

/**
 * Callback return is typed as **only** `PromiseLike` (e.g. `Promise<T>`, `async () => T`).
 */
type IsPureAsyncReturn<T> = [T] extends [never]
  ? false
  : IsAny<T> extends true
  ? false
  : IsUnknownNotAny<T> extends true
  ? false
  : [T] extends [PromiseLike<unknown>]
  ? true
  : false;

/**
 * Callback return may be sync **or** `PromiseLike` (`T | Promise<T>`, `unknown`, `any`, …).
 */
type IsAmbiguousCallbackReturn<T> = [T] extends [never]
  ? false
  : IsAny<T> extends true
  ? true
  : IsUnknownNotAny<T> extends true
  ? true
  : IsNever<Extract<T, PromiseLike<unknown>>> extends true
  ? false
  : [T] extends [PromiseLike<unknown>]
  ? false
  : true;

/**
 * Callback return is typed as never `PromiseLike` (pure sync path at type level).
 */
type IsPureSyncReturn<T> = [T] extends [never]
  ? true
  : IsAny<T> extends true
  ? false
  : IsUnknownNotAny<T> extends true
  ? false
  : IsNever<Extract<T, PromiseLike<unknown>>> extends true
  ? true
  : false;

/**
 * Promise source for the async branch of ambiguous callbacks (`Extract` or `Promise<unknown>`).
 */
type AsyncCallbackPromiseSource<T> = [T] extends [never]
  ? Promise<unknown>
  : IsAny<T> extends true
  ? Promise<unknown>
  : IsUnknownNotAny<T> extends true
  ? Promise<unknown>
  : Extract<T, PromiseLike<unknown>>;

type AsPureAsyncCallback<F extends () => unknown> = F &
  (IsPureAsyncReturn<ReturnType<F>> extends true
    ? unknown
    : { readonly __failableNotPureAsync: never });

type AsAmbiguousCallback<F extends () => unknown> = F &
  (IsAmbiguousCallbackReturn<ReturnType<F>> extends true
    ? unknown
    : { readonly __failableNotAmbiguous: never });

type AsPureSyncCallback<F extends () => unknown> = F &
  (IsPureSyncReturn<ReturnType<F>> extends true
    ? unknown
    : { readonly __failableNotPureSync: never });

type AmbiguousCallbackReturn<T, E = unknown> = IsAny<T> extends true
  ? Failable<unknown, E> | Promise<Failable<unknown, E>>
  : InferFailableFromValue<Exclude<T, PromiseLike<unknown>>, E>
    | InferReturnTypeFromPromise<AsyncCallbackPromiseSource<T>, E>;

type AmbiguousCallbackReturnNormalized<T> = IsAny<T> extends true
  ? NormalizeFailableResult<unknown> | Promise<NormalizeFailableResult<unknown>>
  : NormalizeFailableResult<Exclude<T, PromiseLike<unknown>>>
    | Promise<NormalizeFailableResult<Awaited<AsyncCallbackPromiseSource<T>>>>;

type InferReturnTypeFromPromise<
  P extends PromiseLike<unknown>,
  E = unknown,
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

const RUN_GET_TAG = Symbol('RunGet');

class RunGet<T, E, TSource = Failable<T, E>> {
  readonly [RUN_GET_TAG] = true;
  public readonly source: TSource;

  private constructor(source: TSource) {
    this.source = source;
  }

  static create<T, E, TSource extends Failable<T, E>>(
    source: TSource
  ): RunGet<T, E, TSource> {
    return new RunGet<T, E, TSource>(source);
  }
}

type RunGetIterator<
  T,
  E,
  TSource extends Failable<T, E> = Failable<T, E>
> = Generator<RunGet<T, E, TSource>, T, unknown>;

type AsyncRunGetIterator<
  T,
  E,
  TSource extends Failable<T, E> = Failable<T, E>
> = AsyncGenerator<RunGet<T, E, TSource>, T, unknown>;

type RunYield = RunGet<unknown, unknown, unknown>;
type RunReturn = void | Failable<unknown, unknown>;

type InferRunYieldError<TYield> = TYield extends RunGet<
  unknown,
  infer TError,
  unknown
>
  ? TError
  : never;

type InferRunGuaranteedFailureError<TYield> = TYield extends RunGet<
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
): RunGetIterator<T, never, Success<T>>;
function getRunIterator<E>(
  source: Failure<E>
): RunGetIterator<never, E, Failure<E>>;
function getRunIterator<T, E>(
  source: Failable<T, E>
): RunGetIterator<T, E, Failable<T, E>>;
function* getRunIterator<T, E>(
  source: Failable<T, E>
): RunGetIterator<T, E, Failable<T, E>> {
  return (yield RunGet.create<T, E, Failable<T, E>>(source)) as T;
}

function getAsyncRunIterator<T>(
  source: Success<T>
): AsyncRunGetIterator<T, never, Success<T>>;
function getAsyncRunIterator<E>(
  source: Failure<E>
): AsyncRunGetIterator<never, E, Failure<E>>;
function getAsyncRunIterator<T, E>(
  source: Failable<T, E>
): AsyncRunGetIterator<T, E, Failable<T, E>>;
async function* getAsyncRunIterator<T, E>(
  source: Failable<T, E>
): AsyncRunGetIterator<T, E, Failable<T, E>> {
  return (yield RunGet.create(source)) as T;
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

type FailableSourceIsAsync<T> = T extends PromiseLike<
  Failable<unknown, unknown>
>
  ? true
  : false;

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
): Success<AllSettledTuple<T>> {
  return success(results as AllSettledTuple<T>);
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

export function allSettled<
  const T extends readonly FailableSource<unknown, unknown>[]
>(
  ...sources: T
): TupleHasAsync<T> extends true
  ? Promise<Success<AllSettledTuple<T>>>
  : Success<AllSettledTuple<T>> {
  if (!hasPromiseLikeSources(sources)) {
    return combineAllSettledResults<T>(
      sources.map((source) => toValidatedFailable(source))
    ) as TupleHasAsync<T> extends true
      ? Promise<Success<AllSettledTuple<T>>>
      : Success<AllSettledTuple<T>>;
  }

  return resolveFailableSources(sources).then((results) =>
    combineAllSettledResults<T>(results)
  ) as TupleHasAsync<T> extends true
    ? Promise<Success<AllSettledTuple<T>>>
    : Success<AllSettledTuple<T>>;
}

export function race<
  const T extends readonly PromiseLike<Failable<unknown, unknown>>[]
>(...sources: T): Promise<Failable<RaceData<T>, RaceError<T>>> {
  if (sources.length === 0) {
    return Promise.reject(
      new Error('`race()` requires at least one promised `Failable` source.')
    ) as Promise<Failable<RaceData<T>, RaceError<T>>>;
  }

  for (const source of sources) {
    if (!isPromiseLike(source)) {
      return Promise.reject(
        new Error('`race()` only accepts promised `Failable` sources.')
      ) as Promise<Failable<RaceData<T>, RaceError<T>>>;
    }
  }

  return Promise.race(sources.map((source) => Promise.resolve(source))).then(
    (result) =>
      toValidatedFailable(result) as Failable<RaceData<T>, RaceError<T>>
  );
}

type AsyncRunBuilder<
  TYield extends RunGet<unknown, unknown, unknown> = never,
  TResult extends RunReturn = RunReturn
> = (_helpers: RunNoHelpers) => AsyncGenerator<TYield, TResult, unknown>;

function readRunGetSource(yielded: unknown): Failable<unknown, unknown> {
  if (!(yielded instanceof RunGet)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  const source = yielded.source;
  if (!isFailable(source)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  return source;
}

async function readAsyncRunGetSource(
  yielded: unknown
): Promise<Failable<unknown, unknown>> {
  if (!(yielded instanceof RunGet)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  const source = await yielded.source;
  if (!isFailable(source)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  return source;
}

function closeRunIterator<TYield extends RunYield, TResult extends RunReturn>(
  iterator: Generator<TYield, TResult, unknown>,
  result: Failable<unknown, unknown>
) {
  let closing = iterator.return(result as never);

  while (!closing.done) {
    const source = readRunGetSource(closing.value);
    if (source.status === FailableStatus.Failure) {
      closing = iterator.return(result as never);
      continue;
    }

    closing = iterator.next(source.data);
  }
}

async function closeAsyncRunIterator<
  TYield extends RunGet<unknown, unknown, unknown>,
  TResult extends RunReturn
>(
  iterator: AsyncGenerator<TYield, TResult, unknown>,
  result: Failable<unknown, unknown>
) {
  let closing = await iterator.return(result as never);

  while (!closing.done) {
    const source = await readAsyncRunGetSource(closing.value);
    if (source.status === FailableStatus.Failure) {
      closing = await iterator.return(result as never);
      continue;
    }

    closing = await iterator.next(source.data);
  }
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
  RunGet<unknown, unknown, unknown>,
  RunReturn,
  unknown
> {
  return Symbol.asyncIterator in iterator;
}

function runSyncIterator<TYield extends RunYield, TResult extends RunReturn>(
  iterator: Generator<TYield, TResult, unknown>
): InferRunResult<TYield, TResult> {
  let iteration = iterator.next();

  while (!iteration.done) {
    const source = readRunGetSource(iteration.value);
    if (source.status === FailableStatus.Failure) {
      closeRunIterator(iterator, source);
      return source as InferRunResult<TYield, TResult>;
    }

    iteration = iterator.next(source.data);
  }

  return finalizeRunResult<TYield, TResult>(iteration.value);
}

async function runAsyncIterator<
  TYield extends RunGet<unknown, unknown, unknown>,
  TResult extends RunReturn
>(
  iterator: AsyncGenerator<TYield, TResult, unknown>
): Promise<InferRunResult<TYield, TResult>> {
  let iteration = await iterator.next();

  while (!iteration.done) {
    const source = await readAsyncRunGetSource(iteration.value);
    if (source.status === FailableStatus.Failure) {
      await closeAsyncRunIterator(iterator, source);
      return source as InferRunResult<TYield, TResult>;
    }

    iteration = await iterator.next(source.data);
  }

  return finalizeRunResult<TYield, TResult>(iteration.value);
}

export function run<
  TYield extends RunGet<unknown, unknown, unknown> = never,
  TResult = RunReturn
>(
  builder: ((
    _helpers: RunNoHelpers
  ) => AsyncGenerator<TYield, TResult, unknown>) &
    ValidateRunReturn<TResult>
): Promise<
  InferRunResult<TYield, Extract<TResult, RunReturn>>
>;
export function run<
  TYield extends RunYield = never,
  TResult = RunReturn
>(
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
 * - use `yield* await allSettled(...)` to wait for all sources to resolve and get
 *   a `Success` tuple of each `Failable` result
 * - use `yield* await race(...)` to take the first promised `Failable` to settle
 * - rejected promised sources follow normal async `await` / `try` / `finally`
 *   semantics rather than a helper-managed rejection path
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
    | AsyncRunBuilder<RunGet<unknown, unknown, unknown>, RunReturn>
): unknown {
  const iterator = (
    builder as (
      _helpers: RunNoHelpers
    ) =>
      | Generator<RunYield, RunReturn, unknown>
      | AsyncGenerator<RunGet<unknown, unknown, unknown>, RunReturn, unknown>
  )(RUN_NO_HELPERS);

  if (isAsyncRunIterator(iterator)) {
    return runAsyncIterator(iterator);
  }

  return runSyncIterator(iterator as Generator<RunYield, RunReturn, unknown>);
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
 * - `failable(() => value)` when the callback is typed as purely synchronous
 * - `await failable(async () => value)` / `await failable(() => promise)` when purely async
 * - `await Promise.resolve(failable(...))` when the callback may be sync or async at the type level
 * - `await failable(promise)` for promise-based code that may reject
 * - `run(...)` when the steps already return `Failable`
 */
export function failable<F extends () => unknown>(
  fun: AsPureAsyncCallback<F>,
  normalizeOption: FailableNormalizeErrorInput
): Promise<NormalizeFailableResult<Awaited<ReturnType<F>>>>;
export function failable<F extends () => unknown, E = unknown>(
  fun: AsPureAsyncCallback<F>
): InferReturnTypeFromPromise<
  Extract<ReturnType<F>, PromiseLike<unknown>>,
  E
>;
export function failable<F extends () => unknown>(
  fun: AsAmbiguousCallback<F>,
  normalizeOption: FailableNormalizeErrorInput
): AmbiguousCallbackReturnNormalized<ReturnType<F>>;
export function failable<F extends () => unknown, E = unknown>(
  fun: AsAmbiguousCallback<F>
): AmbiguousCallbackReturn<ReturnType<F>, E>;
export function failable<P extends PromiseLike<unknown>>(
  promise: P,
  normalizeOption: FailableNormalizeErrorInput
): Promise<NormalizeFailableResult<Awaited<P>>>;
export function failable<P extends PromiseLike<unknown>, E = unknown>(
  promise: P
): InferReturnTypeFromPromise<P, E>;
export function failable<F extends () => unknown>(
  fun: AsPureSyncCallback<F>,
  normalizeOption: FailableNormalizeErrorInput
): NormalizeFailableResult<ReturnType<F>>;
export function failable<F extends () => unknown, E = unknown>(
  fun: AsPureSyncCallback<F>
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

function fromFunction<T extends () => U, E, U = ReturnType<T>>(
  fun: T,
  normalizeOption?: FailableNormalizeErrorInput
) {
  try {
    const data = fun();

    if (isPromiseLike(data)) {
      return fromPromise(data, normalizeOption);
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

function getPlainObjectErrorMessage(
  value: Record<string | number | symbol, unknown>
): string {
  if (Object.getPrototypeOf(value) === null) {
    const serializedMessage = getSerializedPlainObjectErrorMessage(value);
    if (serializedMessage !== null) return serializedMessage;

    return Object.prototype.toString.call(value);
  }

  const message = String(value);
  if (message !== '[object Object]') return message;

  const serializedMessage = getSerializedPlainObjectErrorMessage(value);
  if (serializedMessage === null) return message;

  return serializedMessage;
}

function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (Array.isArray(error)) {
    return new AggregateError(error, 'Multiple errors', { cause: error });
  }

  if (isPlainObjectErrorValue(error)) {
    return new Error(getPlainObjectErrorMessage(error), { cause: error });
  }

  return new Error(String(error), { cause: error });
}
