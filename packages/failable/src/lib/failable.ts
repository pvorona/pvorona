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
  ((Success<T> & {
    readonly match: Match<T, E>;
  }) |
    (Failure<E> & {
      readonly match: Match<T, E>;
    }));

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
 * Function-first exports:
 * - `success(data)` / `failure(error)` create hydrated results.
 * - `throwIfError(result)` throws on failure and narrows the same result on success.
 * - `createFailable(...)` captures throws, rejections, and wire shapes.
 * - `run(...)` composes existing `Failable` values.
 *
 * Design goals:
 * - Prefer explicit, typed results over exceptions.
 * - Provide tiny ergonomics (`or`, `getOr`, `getOrThrow`) plus a minimal top-level
 *   `throwIfError(result)` helper.
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
 * - `throwIfError(result)` also throws `.error` unchanged. Normalize earlier with
 *   `createFailable(..., NormalizedErrors)` or a custom `normalizeError` if you need `Error` values.
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

/**
 * Throw `result.error` unchanged on failure, or narrow the same result to {@link Success} on return.
 *
 * Use this when you want control-flow narrowing without replacing the original variable.
 * If you need `Error`-shaped failures, normalize earlier with `createFailable(...)`.
 */
export function throwIfError<T, E>(
  result: Failable<T, E>
): asserts result is Success<T> {
  if (result.status === FailableStatus.Failure) throw result.error;
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

const RUN_GET_TAG = Symbol('RunGet');

class RunGet<
  T,
  E,
  TSource = Failable<T, E>,
> {
  readonly [RUN_GET_TAG] = true;
  public readonly source: TSource;

  private constructor(source: TSource) {
    this.source = source;
  }

  static create<
    T,
    E,
    TSource extends Failable<T, E> | PromiseLike<Failable<T, E>>,
  >(
    source: TSource
  ): RunGet<T, E, TSource> {
    return new RunGet(source);
  }
}

type RunGetIterator<T, E> = Generator<RunGet<T, E>, T, unknown>;

type RunHelpers = {
  readonly get: {
    <T>(source: Success<T>): RunGetIterator<T, never>;
    <E>(source: Failure<E>): RunGetIterator<never, E>;
    <T, E>(source: Failable<T, E>): RunGetIterator<T, E>;
    <T>(
      source: PromiseLike<Success<T>>
    ): AsyncGenerator<RunGet<T, never, unknown>, T, unknown>;
    <E>(
      source: PromiseLike<Failure<E>>
    ): AsyncGenerator<RunGet<never, E, unknown>, never, unknown>;
    <T, E>(
      source: PromiseLike<Failable<T, E>>
    ): AsyncGenerator<RunGet<T, E, unknown>, T, unknown>;
  };
};

type RunYield = RunGet<unknown, unknown>;
type RunReturn =
  | void
  | Success<unknown>
  | Failure<unknown>
  | Failable<unknown, unknown>;

type InferRunYieldError<TYield> = TYield extends RunGet<
  unknown,
  infer TError,
  unknown
>
  ? TError
  : never;

type InferRunReturnData<TResult> = TResult extends void
  ? void
  : TResult extends Success<infer TData>
  ? TData
  : TResult extends Failure<unknown>
  ? never
  : TResult extends Failable<infer TData, unknown>
  ? TData
  : never;

type InferRunReturnError<TResult> = TResult extends void
  ? never
  : TResult extends Success<unknown>
  ? never
  : TResult extends Failure<infer TError>
  ? TError
  : TResult extends Failable<unknown, infer TError>
  ? TError
  : never;

type InferRunError<TYield, TResult> =
  | InferRunYieldError<TYield>
  | InferRunReturnError<TResult>;

type InferRunResult<TYield, TResult> = [TResult] extends [never]
  ? [InferRunYieldError<TYield>] extends [never]
    ? never
    : Failure<InferRunYieldError<TYield>>
  : [InferRunReturnData<TResult>] extends [never]
  ? Failure<InferRunError<TYield, TResult>>
  : [InferRunError<TYield, TResult>] extends [never]
  ? Success<InferRunReturnData<TResult>>
  : Failable<InferRunReturnData<TResult>, InferRunError<TYield, TResult>>;

const RUN_INVALID_YIELD_MESSAGE =
  '`run()` generators must yield only values produced by `get(...)`. Use `yield* get(...)` in normal code.';
const RUN_INVALID_RETURN_MESSAGE =
  '`run()` generators must return a `Failable` or finish without returning a value.';

function getRunIterator<T>(source: Success<T>): RunGetIterator<T, never>;
function getRunIterator<E>(source: Failure<E>): RunGetIterator<never, E>;
function getRunIterator<T, E>(
  source: Failable<T, E>
): RunGetIterator<T, E>;
function* getRunIterator<T, E>(
  source: Failable<T, E>
): RunGetIterator<T, E> {
  return (yield RunGet.create(source)) as T;
}

function getAsyncRunIterator<T>(
  source: Success<T>
): AsyncGenerator<RunGet<T, never, unknown>, T, unknown>;
function getAsyncRunIterator<E>(
  source: Failure<E>
): AsyncGenerator<RunGet<never, E, unknown>, never, unknown>;
function getAsyncRunIterator<T, E>(
  source: Failable<T, E>
): AsyncGenerator<RunGet<T, E, unknown>, T, unknown>;
function getAsyncRunIterator<T>(
  source: PromiseLike<Success<T>>
): AsyncGenerator<RunGet<T, never, unknown>, T, unknown>;
function getAsyncRunIterator<E>(
  source: PromiseLike<Failure<E>>
): AsyncGenerator<RunGet<never, E, unknown>, never, unknown>;
function getAsyncRunIterator<T, E>(
  source: PromiseLike<Failable<T, E>>
): AsyncGenerator<RunGet<T, E, unknown>, T, unknown>;
async function* getAsyncRunIterator<T, E>(
  source: Failable<T, E> | PromiseLike<Failable<T, E>>
): AsyncGenerator<RunGet<T, E, unknown>, T, unknown> {
  return (yield RunGet.create(source)) as T;
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  if (!isObject(value) && !isFunction(value)) {
    return false;
  }

  const candidate = value as { readonly then?: unknown };
  return isFunction(candidate.then);
}

function getRunSourceIterator<T>(source: Success<T>): RunGetIterator<T, never>;
function getRunSourceIterator<E>(source: Failure<E>): RunGetIterator<never, E>;
function getRunSourceIterator<T, E>(
  source: Failable<T, E>
): RunGetIterator<T, E>;
function getRunSourceIterator<T>(
  source: PromiseLike<Success<T>>
): AsyncGenerator<RunGet<T, never, unknown>, T, unknown>;
function getRunSourceIterator<E>(
  source: PromiseLike<Failure<E>>
): AsyncGenerator<RunGet<never, E, unknown>, never, unknown>;
function getRunSourceIterator<T, E>(
  source: PromiseLike<Failable<T, E>>
): AsyncGenerator<RunGet<T, E, unknown>, T, unknown>;
function getRunSourceIterator<T, E>(
  source: Failable<T, E> | PromiseLike<Failable<T, E>>
):
  | RunGetIterator<T, E>
  | AsyncGenerator<RunGet<T, E, unknown>, T, unknown> {
  if (isPromiseLike<Failable<T, E>>(source)) {
    return getAsyncRunIterator(source);
  }

  return getRunIterator(source);
}

const RUN_HELPERS: RunHelpers = Object.freeze({
  get: getRunSourceIterator,
});

type SyncRunBuilder<
  TYield extends RunYield = never,
  TResult extends RunReturn = RunReturn,
> = (helpers: RunHelpers) => Generator<TYield, TResult, unknown>;

type AsyncRunBuilder<
  TYield extends RunGet<unknown, unknown, unknown> = never,
  TResult extends RunReturn = RunReturn,
> = (helpers: RunHelpers) => AsyncGenerator<TYield, TResult, unknown>;

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

type AsyncRunGetSourceRead =
  | { readonly kind: 'source'; readonly source: Failable<unknown, unknown> }
  | { readonly kind: 'rejection'; readonly rejection: unknown };

async function readAsyncRunGetSourceWithRejection(
  yielded: unknown
): Promise<AsyncRunGetSourceRead> {
  if (!(yielded instanceof RunGet)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  let source: unknown;
  try {
    source = await yielded.source;
  } catch (rejection) {
    return { kind: 'rejection', rejection };
  }

  if (!isFailable(source)) {
    throw new Error(RUN_INVALID_YIELD_MESSAGE);
  }

  return { kind: 'source', source };
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
  TResult extends RunReturn,
>(
  iterator: AsyncGenerator<TYield, TResult, unknown>,
  result: Failure<unknown> | undefined
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

async function closeAsyncRunIteratorOnRejection<
  TYield extends RunGet<unknown, unknown, unknown>,
  TResult extends RunReturn,
>(
  iterator: AsyncGenerator<TYield, TResult, unknown>
) {
  let closing = await iterator.return(undefined as never);

  while (!closing.done) {
    const sourceRead = await readAsyncRunGetSourceWithRejection(closing.value);
    if (sourceRead.kind === 'rejection') {
      closing = await iterator.return(undefined as never);
      continue;
    }

    const source = sourceRead.source;
    if (source.status === FailableStatus.Failure) {
      closing = await iterator.return(undefined as never);
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
    return success(undefined) as InferRunResult<TYield, TResult>;
  }

  throw new Error(RUN_INVALID_RETURN_MESSAGE);
}

function isAsyncRunIterator(
  iterator: Generator<RunYield, RunReturn, unknown> | AsyncGenerator<unknown>
): iterator is AsyncGenerator<RunGet<unknown, unknown, unknown>, RunReturn, unknown> {
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
  TResult extends RunReturn,
>(
  iterator: AsyncGenerator<TYield, TResult, unknown>
): Promise<InferRunResult<TYield, TResult>> {
  let iteration = await iterator.next();

  while (!iteration.done) {
    const sourceRead = await readAsyncRunGetSourceWithRejection(iteration.value);
    if (sourceRead.kind === 'rejection') {
      // Promise rejections remain foreign values, but `finally` cleanup should still unwind.
      await closeAsyncRunIteratorOnRejection(iterator);
      throw sourceRead.rejection;
    }

    const source = sourceRead.source;
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
  TResult extends RunReturn = RunReturn,
>(
  builder: (helpers: RunHelpers) => AsyncGenerator<TYield, TResult, unknown>
): Promise<InferRunResult<TYield, TResult>>;
export function run<
  TYield extends RunYield = never,
  TResult extends RunReturn = RunReturn,
>(
  builder: (helpers: RunHelpers) => Generator<TYield, TResult, unknown>
): InferRunResult<TYield, TResult>;
export function run(
  builder:
    | SyncRunBuilder<RunYield, RunReturn>
    | AsyncRunBuilder<RunGet<unknown, unknown, unknown>, RunReturn>
) {
  const probeIterator = (
    builder as (
      helpers: RunHelpers
    ) =>
      | Generator<RunYield, RunReturn, unknown>
      | AsyncGenerator<RunGet<unknown, unknown, unknown>, RunReturn, unknown>
  )(RUN_HELPERS);

  if (isAsyncRunIterator(probeIterator)) {
    return runAsyncIterator(probeIterator);
  }

  return runSyncIterator(probeIterator);
}

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
