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

type Match<T, E> = <U>(
  onSuccess: (data: T) => U,
  onFailure: (error: E) => U
) => U;

export type Failable<T, E> =
  | (Success<T> & {
      readonly match: Match<T, E>;
    })
  | (Failure<E> & {
      readonly match: Match<T, E>;
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
  readonly orElse: <U>(getValue: () => U) => Success<T>;
  readonly getOr: <U>(value: U) => T;
  readonly getOrElse: <U>(getValue: () => U) => T;
  readonly getOrThrow: () => T;
  readonly match: SuccessMatch<T>;
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
  readonly orElse: <U>(getValue: () => U) => Success<U>;
  readonly getOr: <U>(value: U) => U;
  readonly getOrElse: <U>(getValue: () => U) => U;
  readonly getOrThrow: () => never;
  readonly match: FailureMatch<E>;
  readonly [Symbol.iterator]: () => RunGetIterator<never, E, Failure<E>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunGetIterator<
    never,
    E,
    Failure<E>
  >;
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
  isFailure: false,
  data: null,
  error: null,
  or: notImplemented,
  orElse: notImplemented,
  getOr: notImplemented,
  getOrElse: notImplemented,
  getOrThrow: notImplemented,
  match: notImplemented,
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
  node.isFailure = true;
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
    if (this.error === undefined) {
      throw new Error(
        'getOrThrow() called on Failure<void> with no error value'
      );
    }
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
 * - {@link Failure}: `{ status: 'failure', isFailure: true, error: E, data: null }`
 *
 * Function-first exports:
 * - `success()` / `success(data)` / `failure()` / `failure(error)` create hydrated results.
 * - `throwIfError(result)` throws on failure and narrows the same result on success.
 * - `failable(...)` captures synchronous throws, async rejections, and wire shapes.
 * - `run(...)` composes existing `Failable` values.
 *
 * Quick chooser:
 * - `failable(() => value)`: capture synchronous throws from throwy code.
 * - `await failable(promise)`: capture async rejections from promise-based code.
 * - `run(...)`: compose steps that already return `Failable`.
 * - `throwIfError(result)`: keep using the same `result` variable after narrowing.
 * - `result.getOrThrow()`: unwrap the success value in expression or return position.
 *
 * Design goals:
 * - Prefer explicit, typed results over exceptions.
 * - Provide tiny ergonomics (`or`, `getOr`, `getOrThrow`) plus a minimal top-level
 *   `throwIfError(result)` helper.
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
 *   including existing `Error` instances, except for the internal promise-returning callback
 *   misuse guard error, which stays unchanged so the actionable message survives.
 *
 * Gotchas:
 * - `isFailableLike` is intentionally strict: only `{ status, data }` or `{ status, error }`
 *   with no extra enumerable keys. If you need metadata, wrap it: `{ result: failableLike, meta }`.
 * - `or(...)` and `getOr(...)` are eager (fallback is evaluated before the call). Use branching for
 *   lazy fallbacks.
 * - Without normalization options, whatever you throw/reject becomes `.error` unchanged.
 * - `throwIfError(result)` also throws `.error` unchanged. Normalize earlier with
 *   `failable(..., NormalizedErrors)` or a custom `normalizeError` if you need `Error` values.
 * - `failable(() => somePromise)` is not the supported API. In TypeScript,
 *   obviously promise-returning callbacks are rejected. JS or any-cast callers receive
 *   a `Failure<Error>` telling them to pass the promise directly instead of producing
 *   `Success<Promise<...>>`.
 *
 * @example
 * const res = failable(() => JSON.parse(text));
 * if (res.isSuccess) return res.data;
 * console.error(res.error);
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
export function success<T>(data: T): Success<T>;
export function success<T>(data?: T): Success<T | void> {
  const node: Mutable<InternalSuccess<T | void>> = Object.create(BASE_SUCCESS);
  node.data = data;
  return Object.freeze(node);
}

export function failure(): Failure<void>;
export function failure<E>(error: E): Failure<E>;
export function failure<E>(error?: E): Failure<E | void> {
  const node: Mutable<InternalFailure<E | void>> = Object.create(BASE_FAILURE);
  node.error = error;
  return Object.freeze(node);
}

/**
 * Throw `result.error` unchanged on failure, or narrow the same result to {@link Success} on return.
 *
 * Use this when you want control-flow narrowing without replacing the original variable.
 * Use `result.getOrThrow()` when you need the success value itself in expression or return position.
 * If you need `Error`-shaped failures, normalize earlier with `failable(...)`.
 */
export function throwIfError<T, E>(
  result: Failable<T, E>
): asserts result is Success<T> {
  if (result.status === FailableStatus.Failure) throw result.error;
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

const FAILABLE_PROMISE_CALLBACK_MESSAGE =
  '`failable(() => ...)` only accepts synchronous callbacks. This callback returned a Promise. Pass the promise directly instead: `await failable(promise)`.';
const FAILABLE_PROMISE_CALLBACK_GUARD_TAG = Symbol(
  'FailablePromiseCallbackGuard'
);

type FailablePromiseCallbackGuardError = Error & {
  readonly [FAILABLE_PROMISE_CALLBACK_GUARD_TAG]: true;
};

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
type RunReturnSuccessLike<TData = unknown> = Pick<
  Success<TData>,
  'status' | 'data' | 'error' | 'match'
>;
type RunReturnFailureLike<TError = unknown> = Pick<
  Failure<TError>,
  'status' | 'data' | 'error' | 'match'
>;
type RunReturn =
  | void
  | RunReturnSuccessLike<unknown>
  | RunReturnFailureLike<unknown>
  | Failable<unknown, unknown>;

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
  | (Extract<TResult, RunReturnSuccessLike> extends {
      readonly data: infer TData;
    }
      ? TData
      : never);

type InferRunUnionReturnError<TResult> = Extract<
  TResult,
  RunReturnFailureLike
> extends { readonly error: infer TError }
  ? TError
  : never;

type InferRunResult<TYield, TResult> = [TResult] extends [never]
  ? [InferRunYieldError<TYield>] extends [never]
    ? never
    : Failure<InferRunYieldError<TYield>>
  : [TResult] extends [void]
  ? InferRunSuccessResult<TYield, void>
  : [TResult] extends [RunReturnSuccessLike<infer TData>]
  ? [TData] extends [never]
    ? InferRunNeverSuccessResult<TYield>
    : InferRunSuccessResult<TYield, TData>
  : [TResult] extends [RunReturnFailureLike<infer TError>]
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

type FailableSourceIsAsync<T> =
  T extends PromiseLike<Failable<unknown, unknown>> ? true : false;

type FailableSourceHasGuaranteedFailure<T> =
  T extends Failure<unknown> | PromiseLike<Failure<unknown>> ? true : false;

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

  return success(tuple) as Failable<AllReturnData<T>, AllTupleError<T>>;
}

function combineAllSettledResults<T extends readonly unknown[]>(
  results: readonly Failable<unknown, unknown>[]
): Success<AllSettledTuple<T>> {
  return success(results as AllSettledTuple<T>);
}

export function all<const T extends readonly FailableSource<unknown, unknown>[]>(
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
    (result) => toValidatedFailable(result) as Failable<RaceData<T>, RaceError<T>>
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
  result: Failure<unknown>
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
  result: Failure<unknown>
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
  TResult extends RunReturn = RunReturn
>(
  builder: (
    _helpers: RunNoHelpers
  ) => AsyncGenerator<TYield, TResult, unknown>
): Promise<InferRunResult<TYield, TResult>>;
export function run<
  TYield extends RunYield = never,
  TResult extends RunReturn = RunReturn
>(
  builder: (_helpers: RunNoHelpers) => Generator<TYield, TResult, unknown>
): InferRunResult<TYield, TResult>;
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
export function failable<T, P extends PromiseLike<T> = PromiseLike<T>>(
  promise: P,
  normalizeOption: FailableNormalizeErrorInput
): Promise<NormalizeFailableResult<Awaited<P>>>;
export function failable<
  T,
  E = unknown,
  P extends PromiseLike<T> = PromiseLike<T>
>(promise: P): InferReturnTypeFromPromise<T, E, P>;
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

function createPromiseReturningCallbackGuardError(): FailablePromiseCallbackGuardError {
  const error = new Error(
    FAILABLE_PROMISE_CALLBACK_MESSAGE
  ) as FailablePromiseCallbackGuardError;

  Object.defineProperty(error, FAILABLE_PROMISE_CALLBACK_GUARD_TAG, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return error;
}

function isPromiseReturningCallbackGuardError(
  error: unknown
): error is FailablePromiseCallbackGuardError {
  if (!(error instanceof Error)) return false;

  return (
    Object.getOwnPropertyDescriptor(error, FAILABLE_PROMISE_CALLBACK_GUARD_TAG)
      ?.value === true
  );
}

function consumePromiseLikeRejection(value: PromiseLike<unknown>) {
  void Promise.resolve(value).catch(() => undefined);
}

function fromFunction<T extends () => U, E, U = ReturnType<T>>(
  fun: T,
  normalizeOption?: FailableNormalizeErrorInput
) {
  try {
    const data = fun();

    if (isPromiseLike(data)) {
      consumePromiseLikeRejection(data);
      return normalizeFailableResult(
        failure(createPromiseReturningCallbackGuardError()),
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

function fromPromise<T extends PromiseLike<U>, U = Awaited<T>>(
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
  if (isPromiseReturningCallbackGuardError(result.error)) return result;

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
