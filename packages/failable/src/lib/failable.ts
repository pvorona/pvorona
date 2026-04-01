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

type FailableToReason<Reason> = (reason: unknown) => Reason;
type FailableToError<Reason> = (reason: Reason) => Error | string;
type FailableToErrorInput<Reason> = FailableToError<Reason> | string;
type NonFunctionValue<Value> = Value extends (...args: never[]) => unknown
  ? never
  : Value;
type FailableToReasonInput<Reason> =
  | FailableToReason<Reason>
  | NonFunctionValue<Reason>;
type GetOrThrow<Result, Reason> = {
  (): Result;
  (toError: FailableToErrorInput<Reason>): Result;
};

type LazyFallback<Reason, Output> = (reason: Reason) => Output;

type Match<Result, Reason> = <OnSuccessOutput, OnFailureOutput>(
  onSuccess: (data: Result) => OnSuccessOutput,
  onFailure: (reason: Reason) => OnFailureOutput
) => OnSuccessOutput | OnFailureOutput;

export type Failable<Result, Reason> =
  | (Omit<
      Success<Result>,
      'orElse' | 'getOrElse' | 'map' | 'mapError' | 'flatMap'
    > & {
      readonly orElse: <Fallback>(
        fallback: LazyFallback<Reason, Fallback>
      ) => Success<Result>;
      readonly getOrElse: <Fallback>(
        fallback: LazyFallback<Reason, Fallback>
      ) => Result;
      readonly match: Match<Result, Reason>;
      readonly map: FailableMap<Result, Reason>;
      readonly mapError: FailableMapError<Result, Reason>;
      readonly flatMap: FailableFlatMap<Result, Reason>;
    })
  | (Omit<
      Failure<Reason>,
      'orElse' | 'getOrElse' | 'map' | 'mapError' | 'flatMap'
    > & {
      readonly orElse: <Fallback>(
        fallback: LazyFallback<Reason, Fallback>
      ) => Success<Fallback>;
      readonly getOrElse: <Fallback>(
        fallback: LazyFallback<Reason, Fallback>
      ) => Fallback;
      readonly match: Match<Result, Reason>;
      readonly map: FailableMap<Result, Reason>;
      readonly mapError: FailableMapError<Result, Reason>;
      readonly flatMap: FailableFlatMap<Result, Reason>;
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
export type FailableLike<Result, Reason> =
  | FailableLikeSuccess<Result>
  | FailableLikeFailure<Reason>;

export type FailableLikeSuccess<Result> = {
  readonly status: typeof FailableStatus.Success;
  readonly data: Result;
};

export type FailableLikeFailure<Reason> = {
  readonly status: typeof FailableStatus.Failure;
  readonly error: Reason;
};

type SuccessMatch<Result> = {
  <OnSuccessOutput, OnFailureOutput>(
    onSuccess: (data: Result) => OnSuccessOutput,
    onFailure: (reason: never) => OnFailureOutput
  ): OnSuccessOutput;
};

type FailureMatch<Reason> = {
  <OnSuccessOutput, OnFailureOutput>(
    onSuccess: (data: never) => OnSuccessOutput,
    onFailure: (reason: Reason) => OnFailureOutput
  ): OnFailureOutput;
};

type SuccessMap<Result> = {
  <Output>(transform: (data: Result) => Output): Success<Output>;
};

type FailureMap<Reason> = {
  <Output>(transform: (data: never) => Output): Failure<Reason>;
};

type SuccessMapError<Result> = {
  <OutputError>(transform: (reason: never) => OutputError): Success<Result>;
};

type FailureMapError<Reason> = {
  <OutputError>(
    transform: (reason: Reason) => OutputError
  ): Failure<OutputError>;
};

type SuccessFlatMap<Result> = {
  <Output>(transform: (data: Result) => Success<Output>): Success<Output>;
  <OutputError>(
    transform: (data: Result) => Failure<OutputError>
  ): Failure<OutputError>;
  <Output, OutputError>(
    transform: (data: Result) => Failable<Output, OutputError>
  ): Failable<Output, OutputError>;
};

type FailureFlatMap<Reason> = {
  <Output, OutputError>(
    transform: (data: never) => Failable<Output, OutputError>
  ): Failure<Reason>;
};

type FailableMap<Result, Reason> = {
  <Output>(transform: (data: Result) => Output): Failable<Output, Reason>;
};

type FailableMapError<Result, Reason> = {
  <OutputError>(transform: (reason: Reason) => OutputError): Failable<
    Result,
    OutputError
  >;
};

type FailableFlatMap<Result, Reason> = {
  <Output>(transform: (data: Result) => Success<Output>): Failable<
    Output,
    Reason
  >;
  <OutputError>(transform: (data: Result) => Failure<OutputError>): Failure<
    Reason | OutputError
  >;
  <Output, OutputError>(
    transform: (data: Result) => Success<Output> | Failure<OutputError>
  ): Failable<Output, Reason | OutputError>;
  <Output, OutputError>(
    transform: (data: Result) => Failable<Output, OutputError>
  ): Failable<Output, Reason | OutputError>;
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

export type Success<Result> = {
  readonly status: typeof FailableStatus.Success;
  readonly isSuccess: true;
  readonly isFailure: false;
  readonly data: Result;
  readonly error: null;
  readonly or: <Fallback>(fallback: Fallback) => Success<Result>;
  readonly orElse: <Output>(
    fallback: LazyFallback<never, Output>
  ) => Success<Result>;
  readonly getOr: <Fallback>(fallback: Fallback) => Result;
  readonly getOrElse: <Output>(fallback: LazyFallback<never, Output>) => Result;
  readonly getOrThrow: GetOrThrow<Result, never>;
  readonly match: SuccessMatch<Result>;
  readonly map: SuccessMap<Result>;
  readonly mapError: SuccessMapError<Result>;
  readonly flatMap: SuccessFlatMap<Result>;
  readonly [Symbol.iterator]: () => RunIterator<Result, never, Success<Result>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunIterator<
    Result,
    never,
    Success<Result>
  >;
};

export type Failure<Reason> = {
  readonly status: typeof FailableStatus.Failure;
  readonly isSuccess: false;
  readonly isFailure: true;
  readonly error: Reason;
  readonly data: null;
  readonly or: <Fallback>(fallback: Fallback) => Success<Fallback>;
  readonly orElse: <Output>(
    fallback: LazyFallback<Reason, Output>
  ) => Success<Output>;
  readonly getOr: <Fallback>(fallback: Fallback) => Fallback;
  readonly getOrElse: <Output>(
    fallback: LazyFallback<Reason, Output>
  ) => Output;
  readonly getOrThrow: GetOrThrow<never, Reason>;
  readonly match: FailureMatch<Reason>;
  readonly map: FailureMap<Reason>;
  readonly mapError: FailureMapError<Reason>;
  readonly flatMap: FailureFlatMap<Reason>;
  readonly [Symbol.iterator]: () => RunIterator<never, Reason, Failure<Reason>>;
  readonly [Symbol.asyncIterator]: () => AsyncRunIterator<
    never,
    Reason,
    Failure<Reason>
  >;
};

type InternalSuccess<Result> = Omit<Success<Result>, 'orElse' | 'getOrElse'> & {
  readonly [FAILABLE_TAG]: true;
  readonly [SUCCESS_TAG]: true;
  readonly orElse: <Output>(
    fallback: LazyFallback<never, Output>
  ) => Success<Result>;
  readonly getOrElse: <Output>(fallback: LazyFallback<never, Output>) => Result;
};

type InternalFailure<Reason> = Omit<Failure<Reason>, 'orElse' | 'getOrElse'> & {
  readonly [FAILABLE_TAG]: true;
  readonly [FAILURE_TAG]: true;
  readonly orElse: <Output>(
    fallback: LazyFallback<Reason, Output>
  ) => Success<Output>;
  readonly getOrElse: <Output>(
    fallback: LazyFallback<Reason, Output>
  ) => Output;
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
  mapError: notImplemented,
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

function toThrownError<Reason>(
  reason: Reason,
  toError?: FailableToErrorInput<Reason>
): Error {
  if (toError === undefined) {
    return defaultToError(reason);
  }

  if (typeof toError === 'string') {
    return new Error(toError, { cause: reason });
  }

  const throwable = toError(reason);
  if (throwable instanceof Error) {
    return throwable;
  }

  return new Error(throwable, { cause: reason });
}

function throwNormalizedFailure<Reason>(
  reason: Reason,
  toError?: FailableToErrorInput<Reason>
): never {
  throw toThrownError(reason, toError);
}

const BASE_SUCCESS = (() => {
  const node: Mutable<InternalSuccess<unknown>> = Object.create(BASE_FAILABLE);
  node[SUCCESS_TAG] = true;
  node.status = FailableStatus.Success;
  node.isSuccess = true;
  node.or = function orSuccess(fallback) {
    void fallback;
    return this as Success<unknown>;
  };
  node.orElse = function orElseSuccess() {
    return this as Success<unknown>;
  };
  node.getOr = function getOrSuccess(fallback) {
    void fallback;
    return this.data;
  };
  node.getOrElse = function getOrElseSuccess() {
    return this.data;
  };
  node.getOrThrow = function getOrThrowSuccess(
    _toError?: FailableToErrorInput<never>
  ) {
    void _toError;
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
    transform: (data: unknown) => unknown
  ) {
    return success(transform(this.data));
  } as SuccessMap<unknown>;
  node.mapError = function mapErrorSuccess(this: InternalSuccess<unknown>) {
    return this;
  } as SuccessMapError<unknown>;
  node.flatMap = function flatMapSuccess(
    this: InternalSuccess<unknown>,
    transform: (data: unknown) => unknown
  ) {
    return transform(this.data);
  } as SuccessFlatMap<unknown>;
  return Object.freeze(node);
})();

const BASE_FAILURE = (() => {
  const node: Mutable<InternalFailure<unknown>> = Object.create(BASE_FAILABLE);
  node[FAILURE_TAG] = true;
  node.status = FailableStatus.Failure;
  node.isFailure = true;
  node.or = function orFailure(fallback) {
    return success(fallback);
  };
  node.orElse = function orElseFailure<Output>(
    fallback: LazyFallback<unknown, Output>
  ) {
    return success(fallback(this.error));
  };
  node.getOr = function getOrFailure(fallback) {
    return fallback;
  };
  node.getOrElse = function getOrElseFailure<Output>(
    fallback: LazyFallback<unknown, Output>
  ) {
    return fallback(this.error);
  };
  node.getOrThrow = function getOrThrowFailure(
    toError?: FailableToErrorInput<unknown>
  ) {
    throwNormalizedFailure(this.error, toError);
  };
  node.match = function matchFailure(
    this: InternalFailure<unknown>,
    _onSuccess: (data: unknown) => unknown,
    onFailure: (reason: unknown) => unknown
  ) {
    return onFailure(this.error);
  } as FailureMatch<unknown>;
  node.map = function mapFailure(this: InternalFailure<unknown>) {
    return this;
  } as FailureMap<unknown>;
  node.mapError = function mapErrorFailure(
    this: InternalFailure<unknown>,
    transform: (reason: unknown) => unknown
  ) {
    return failure(transform(this.error));
  } as FailureMapError<unknown>;
  node.flatMap = function flatMapFailure(this: InternalFailure<unknown>) {
    return this;
  } as FailureFlatMap<unknown>;
  return Object.freeze(node);
})();

/**
 * Factory + utilities for the {@link Failable} result type.
 *
 * `Failable<Result, Reason>` is a discriminated union of:
 * - {@link Success}: `{ status: 'success', isSuccess: true, data: Result, error: null }`
 * - {@link Failure}: `{ status: 'failure', isFailure: true, error: Reason, data: null }`
 *
 * Function-first exports:
 * - `success()` / `success(data)` / `failure()` / `failure(reason)` create hydrated results.
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
 * - `throwIfFailure(result, toError?)`: keep using the same `result`
 *   variable after narrowing, with optional throw-boundary conversion.
 * - `result.getOrThrow(toError?)`: unwrap the success value in expression or
 *   return position, with optional throw-boundary conversion.
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
 * - `failable(input, toReason)` captures thrown or rejected values into a
 *   caller-defined reason shape.
 * - `failable(input, fixedReason)` captures thrown or rejected values into the
 *   same fixed reason every time.
 *
 * Gotchas:
 * - `isFailableLike` is intentionally strict: only `{ status, data }` or `{ status, error }`
 *   with no extra enumerable keys. If you need metadata, wrap it: `{ result: failableLike, meta }`.
 * - `or(...)` and `getOr(...)` are eager (fallback is evaluated before the call). Use branching for
 *   lazy fallbacks.
 * - Without normalization options, whatever you throw/reject becomes `.error` unchanged.
 * - `getOrThrow()` and `throwIfFailure(result)` always throw `Error` values.
 *   Existing `Error` instances are preserved unchanged. Other reason values use
 *   a built-in default `Reason -> Error` conversion.
 * - Pass a `toError(...)` callback or string message directly to
 *   `getOrThrow(...)` or `throwIfFailure(...)` when you need a specific
 *   throwable shape or message.
 * - `failable(() => somePromise)` captures only synchronous throws from the
 *   callback itself. The returned promise stays in the success channel.
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
export function success<const Result>(data: Result): Success<Result>;
export function success<const Result>(data?: Result): Success<Result | void> {
  const node: Mutable<InternalSuccess<Result | void>> =
    Object.create(BASE_SUCCESS);
  node.data = data;
  return Object.freeze(node) as Success<Result | void>;
}

export function failure(): Failure<void>;
export function failure<const Reason>(reason: Reason): Failure<Reason>;
export function failure<const Reason>(reason?: Reason): Failure<Reason | void> {
  const node: Mutable<InternalFailure<Reason | void>> =
    Object.create(BASE_FAILURE);
  node.error = reason;
  return Object.freeze(node) as Failure<Reason | void>;
}

/**
 * Throw an `Error` on failure, or narrow the same result to {@link Success} on return.
 *
 * Use this when you want control-flow narrowing without replacing the original
 * variable. Use `result.getOrThrow()` when you need the success value itself in
 * expression or return position. Existing `Error` instances are thrown
 * unchanged by default. Pass `toError` or a direct string message when you
 * need a specific throwable shape or message at the throw boundary.
 */
export function throwIfFailure<Result, Reason>(
  result: Failable<Result, Reason>
): asserts result is Success<Result>;
export function throwIfFailure<Result, Reason>(
  result: Failable<Result, Reason>,
  message: string
): asserts result is Success<Result>;
export function throwIfFailure<Result, Reason>(
  result: Failable<Result, Reason>,
  toError: FailableToError<Reason>
): asserts result is Success<Result>;
export function throwIfFailure<Result, Reason>(
  result: Failable<Result, Reason>,
  toError?: FailableToErrorInput<Reason>
): asserts result is Success<Result> {
  if (result.status === FailableStatus.Failure) {
    throwNormalizedFailure(result.error, toError);
  }
}

export function toFailableLike<Result>(
  value: Success<Result>
): FailableLikeSuccess<Result>;
export function toFailableLike<Reason>(
  value: Failure<Reason>
): FailableLikeFailure<Reason>;
export function toFailableLike<Result, Reason>(
  value: Failable<Result, Reason>
): FailableLike<Result, Reason>;
export function toFailableLike<Result, Reason>(
  value: Failable<Result, Reason>
): FailableLike<Result, Reason> {
  if (value.status === FailableStatus.Failure) {
    return { status: FailableStatus.Failure, error: value.error };
  }

  return { status: FailableStatus.Success, data: value.data };
}

type InferFailableFromValue<Value, Reason = unknown> = [Value] extends [never]
  ? Failure<Reason>
  : Value extends Success<infer InferredResult>
  ? Success<InferredResult>
  : Value extends Failure<infer InferredReason>
  ? Failure<InferredReason>
  : Value extends FailableLikeSuccess<infer InferredResult>
  ? Success<InferredResult>
  : Value extends FailableLikeFailure<infer InferredReason>
  ? Failure<InferredReason>
  : Value extends Failable<infer InferredResult, infer InferredReason>
  ? Failable<InferredResult, InferredReason>
  : Value extends FailableLike<infer InferredResult, infer InferredReason>
  ? Failable<InferredResult, InferredReason>
  : Failable<Value, Reason>;

type IsAny<Value> = 0 extends 1 & Value ? true : false;

type InferReturnTypeFromPromise<
  PromiseSource extends PromiseLike<unknown>,
  InputError = unknown
> = [Awaited<PromiseSource>] extends [never]
  ? Promise<Failure<InputError>>
  : Awaited<PromiseSource> extends Success<infer Data>
  ? Promise<Success<Data>>
  : Awaited<PromiseSource> extends Failure<infer FailureError>
  ? Promise<Failure<FailureError>>
  : Awaited<PromiseSource> extends Failable<unknown, unknown>
  ? Promise<Awaited<PromiseSource>>
  : Awaited<PromiseSource> extends FailableLikeSuccess<infer Data>
  ? Promise<Success<Data>>
  : Awaited<PromiseSource> extends FailableLikeFailure<infer FailureError>
  ? Promise<Failure<FailureError>>
  : Awaited<PromiseSource> extends FailableLike<infer Data, infer FailureError>
  ? Promise<Failable<Data, FailureError>>
  : Promise<Failable<Awaited<PromiseSource>, InputError>>;

type CaptureResult<Value, Reason> = [Value] extends [never]
  ? Failure<Reason>
  : Failable<Value, Reason>;

type ResultLikeValue =
  | FailableLike<unknown, unknown>
  | Failable<unknown, unknown>;

type HasResultLikeValue<Value> = IsAny<Value> extends true
  ? false
  : unknown extends Value
  ? false
  : [Extract<Value, ResultLikeValue>] extends [never]
  ? false
  : true;

type DisallowToReasonForResultLike<Value> =
  HasResultLikeValue<Value> extends true
    ? { readonly __failableToReasonRequiresRawCaptureInput: never }
    : unknown;

type FailableInput =
  | FailableLike<unknown, unknown>
  | Failable<unknown, unknown>
  | (() => unknown)
  | PromiseLike<unknown>;

class RunStep<Result, Reason, Source = Failable<Result, Reason>> {
  public readonly source: Source;

  private constructor(source: Source) {
    this.source = source;
  }

  static create<Result, Reason, Source extends Failable<Result, Reason>>(
    source: Source
  ): RunStep<Result, Reason, Source> {
    return new RunStep<Result, Reason, Source>(source);
  }
}

type RunIterator<
  Result,
  Reason,
  Source extends Failable<Result, Reason> = Failable<Result, Reason>
> = Generator<RunStep<Result, Reason, Source>, Result, unknown>;

type AsyncRunIterator<
  Result,
  Reason,
  Source extends Failable<Result, Reason> = Failable<Result, Reason>
> = AsyncGenerator<RunStep<Result, Reason, Source>, Result, unknown>;

type RunYield = RunStep<unknown, unknown, unknown>;
type RunReturnSuccessLike<Data = unknown> = {
  readonly isSuccess: true;
  readonly isFailure: false;
  readonly data: Data;
  readonly error: null;
};
type RunReturnFailureLike<ReturnError = unknown> = {
  readonly isSuccess: false;
  readonly isFailure: true;
  readonly data: null;
  readonly error: ReturnError;
};
type RunReturn = void | Failable<unknown, unknown>;

type InferRunYieldError<Yield> = Yield extends RunStep<
  unknown,
  infer YieldError,
  unknown
>
  ? YieldError
  : never;

type InferRunGuaranteedFailureError<Yield> = Yield extends RunStep<
  unknown,
  infer YieldError,
  infer Source
>
  ? [Source] extends [Failure<YieldError>]
    ? YieldError
    : never
  : never;

type MergeRunErrors<Yield, ReturnError> =
  | InferRunYieldError<Yield>
  | ReturnError;

type InferRunSuccessResult<Yield, Data> = [InferRunYieldError<Yield>] extends [
  never
]
  ? Success<Data>
  : Failable<Data, InferRunYieldError<Yield>>;

type InferRunNeverSuccessResult<Yield> = [InferRunYieldError<Yield>] extends [
  never
]
  ? Success<never>
  : [InferRunGuaranteedFailureError<Yield>] extends [never]
  ? Failable<never, InferRunYieldError<Yield>>
  : Failure<InferRunYieldError<Yield>>;

type InferRunUnionReturnData<Result> =
  | ([Extract<Result, void>] extends [never] ? never : void)
  | (Extract<Result, RunReturnSuccessLike> extends {
      readonly data: infer Data;
    }
      ? Data
      : never);

type InferRunUnionReturnError<Result> = Extract<
  Result,
  RunReturnFailureLike
> extends { readonly error: infer ReturnError }
  ? ReturnError
  : never;

type InferRunResult<Yield, Result> = [Result] extends [never]
  ? [InferRunYieldError<Yield>] extends [never]
    ? never
    : Failure<InferRunYieldError<Yield>>
  : [Result] extends [void]
  ? InferRunSuccessResult<Yield, void>
  : [Result] extends [RunReturnSuccessLike<infer Data>]
  ? [Data] extends [never]
    ? InferRunNeverSuccessResult<Yield>
    : InferRunSuccessResult<Yield, Data>
  : [Result] extends [RunReturnFailureLike<infer ReturnError>]
  ? Failure<MergeRunErrors<Yield, ReturnError>>
  : [MergeRunErrors<Yield, InferRunUnionReturnError<Result>>] extends [never]
  ? Success<InferRunUnionReturnData<Result>>
  : Failable<
      InferRunUnionReturnData<Result>,
      MergeRunErrors<Yield, InferRunUnionReturnError<Result>>
    >;

const RUN_INVALID_YIELD_MESSAGE =
  '`run()` generators must use `yield*` only with hydrated `Failable` values. Use `yield* helper()` for sync helpers and `yield* await promisedHelper()` for promised sources.';
const RUN_INVALID_RETURN_MESSAGE =
  '`run()` generators must return a `Failable` or finish without returning a value.';

function getRunIterator<Result>(
  source: Success<Result>
): RunIterator<Result, never, Success<Result>>;
function getRunIterator<Reason>(
  source: Failure<Reason>
): RunIterator<never, Reason, Failure<Reason>>;
function getRunIterator<Result, Reason>(
  source: Failable<Result, Reason>
): RunIterator<Result, Reason, Failable<Result, Reason>>;
function* getRunIterator<Result, Reason>(
  source: Failable<Result, Reason>
): RunIterator<Result, Reason, Failable<Result, Reason>> {
  return (yield RunStep.create<Result, Reason, Failable<Result, Reason>>(
    source
  )) as Result;
}

function getAsyncRunIterator<Result>(
  source: Success<Result>
): AsyncRunIterator<Result, never, Success<Result>>;
function getAsyncRunIterator<Reason>(
  source: Failure<Reason>
): AsyncRunIterator<never, Reason, Failure<Reason>>;
function getAsyncRunIterator<Result, Reason>(
  source: Failable<Result, Reason>
): AsyncRunIterator<Result, Reason, Failable<Result, Reason>>;
async function* getAsyncRunIterator<Result, Reason>(
  source: Failable<Result, Reason>
): AsyncRunIterator<Result, Reason, Failable<Result, Reason>> {
  return (yield RunStep.create(source)) as Result;
}

function isPromiseLike<ResolvedValue>(
  value: unknown
): value is PromiseLike<ResolvedValue> {
  if (!isObject(value) && !isFunction(value)) {
    return false;
  }

  const candidate = value as { readonly then?: unknown };
  return isFunction(candidate.then);
}

type SyncRunBuilder<
  Yield extends RunYield = never,
  Result extends RunReturn = RunReturn
> = (_helpers: RunNoHelpers) => Generator<Yield, Result, unknown>;

type RunNoHelpers = {
  readonly __runNoHelpers?: never;
};

const RUN_NO_HELPERS: RunNoHelpers = Object.freeze({});
type ValidateRunReturn<Result> = [Result] extends [RunReturn]
  ? unknown
  : { readonly __runInvalidReturn: never };

type FailableSource<Result, Reason> =
  | Failable<Result, Reason>
  | PromiseLike<Failable<Result, Reason>>;

/**
 * Reject obvious bare `Promise.reject(...)` inputs (`PromiseLike<never>`) while
 * preserving the caller's original tuple types for valid sources.
 */
type GuardedFailableSourceInput<Source> = Source extends PromiseLike<
  infer Resolved
>
  ? [Resolved] extends [never]
    ? never
    : Source extends PromiseLike<Failable<unknown, unknown>>
    ? Source
    : never
  : Source extends Failable<unknown, unknown>
  ? Source
  : never;

type AllSettledSources<Sources extends readonly unknown[]> = {
  readonly [Index in keyof Sources]: GuardedFailableSourceInput<Sources[Index]>;
};

type RaceSources<Sources extends readonly unknown[]> = {
  readonly [Index in keyof Sources]: GuardedFailableSourceInput<Sources[Index]>;
};

type FailableSourceError<Source> = Source extends Success<unknown>
  ? never
  : Source extends Failure<infer SourceError>
  ? SourceError
  : Source extends Failable<unknown, infer SourceError>
  ? SourceError
  : Source extends PromiseLike<Success<unknown>>
  ? never
  : Source extends PromiseLike<Failure<infer SourceError>>
  ? SourceError
  : Source extends PromiseLike<Failable<unknown, infer SourceError>>
  ? SourceError
  : never;

type FailableSourceData<Source> = Source extends Success<infer Data>
  ? Data
  : Source extends Failure<unknown>
  ? never
  : Source extends Failable<infer Data, unknown>
  ? Data
  : Source extends PromiseLike<Success<infer Data>>
  ? Data
  : Source extends PromiseLike<Failure<unknown>>
  ? never
  : Source extends PromiseLike<Failable<infer Data, unknown>>
  ? Data
  : never;

type AllTupleError<Sources> = Sources extends readonly (infer Source)[]
  ? FailableSourceError<Source>
  : never;

type AllTupleData<Sources> = {
  readonly [Index in keyof Sources]: FailableSourceData<Sources[Index]>;
};

type FailableSourceSettled<Source> = Source extends Success<infer Data>
  ? Success<Data>
  : Source extends Failure<infer SourceError>
  ? Failure<SourceError>
  : Source extends Failable<infer Data, infer SourceError>
  ? Failable<Data, SourceError>
  : Source extends PromiseLike<Success<infer Data>>
  ? Success<Data>
  : Source extends PromiseLike<Failure<infer SourceError>>
  ? Failure<SourceError>
  : Source extends PromiseLike<Failable<infer Data, infer SourceError>>
  ? Failable<Data, SourceError>
  : never;

type FailableSourceIsAsync<Source> = [
  Extract<Source, PromiseLike<Failable<unknown, unknown>>>
] extends [never]
  ? false
  : true;

type FailableSourceHasGuaranteedFailure<Source> = Source extends
  | Failure<unknown>
  | PromiseLike<Failure<unknown>>
  ? true
  : false;

type TupleHasAsync<Sources> = Sources extends readonly [
  infer First,
  ...infer Rest
]
  ? FailableSourceIsAsync<First> extends true
    ? true
    : Rest extends readonly unknown[]
    ? TupleHasAsync<Rest>
    : false
  : false;

/** True when at least one element of Sources is Failure<...> or PromiseLike<Failure<...>>. */
type AllTupleHasGuaranteedFailure<Sources> = Sources extends readonly [
  infer First,
  ...infer Rest
]
  ? FailableSourceHasGuaranteedFailure<First> extends true
    ? true
    : Rest extends readonly unknown[]
    ? AllTupleHasGuaranteedFailure<Rest>
    : false
  : false;

type AllReturnData<Sources> = AllTupleHasGuaranteedFailure<Sources> extends true
  ? never
  : AllTupleData<Sources>;

type AllSettledTuple<Sources> = {
  readonly [Index in keyof Sources]: FailableSourceSettled<Sources[Index]>;
};

type RaceData<Sources> = Sources extends readonly (infer Source)[]
  ? FailableSourceData<Source>
  : never;

type RaceError<Sources> = Sources extends readonly (infer Source)[]
  ? FailableSourceError<Source>
  : never;

type RaceReturn<Sources extends readonly unknown[]> =
  Sources extends readonly []
    ? Promise<Failable<RaceData<Sources>, RaceError<Sources>>>
    : TupleHasAsync<Sources> extends true
    ? Promise<Failable<RaceData<Sources>, RaceError<Sources>>>
    : Failable<RaceData<Sources>, RaceError<Sources>>;

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

function combineAllResults<Sources extends readonly unknown[]>(
  results: readonly Failable<unknown, unknown>[]
): Failable<AllReturnData<Sources>, AllTupleError<Sources>> {
  for (const result of results) {
    if (result.status === FailableStatus.Failure) {
      return result as Failure<AllTupleError<Sources>>;
    }
  }

  const tuple = results.map(
    (result) => (result as Success<unknown>).data
  ) as AllTupleData<Sources>;

  return success(tuple) as unknown as Failable<
    AllReturnData<Sources>,
    AllTupleError<Sources>
  >;
}

function combineAllSettledResults<Sources extends readonly unknown[]>(
  results: readonly Failable<unknown, unknown>[]
): AllSettledTuple<Sources> {
  return results as AllSettledTuple<Sources>;
}

export function all<
  const Sources extends readonly FailableSource<unknown, unknown>[]
>(
  ...sources: Sources
): TupleHasAsync<Sources> extends true
  ? Promise<Failable<AllReturnData<Sources>, AllTupleError<Sources>>>
  : Failable<AllReturnData<Sources>, AllTupleError<Sources>> {
  if (!hasPromiseLikeSources(sources)) {
    return combineAllResults<Sources>(
      sources.map((source) => toValidatedFailable(source))
    ) as TupleHasAsync<Sources> extends true
      ? Promise<Failable<AllReturnData<Sources>, AllTupleError<Sources>>>
      : Failable<AllReturnData<Sources>, AllTupleError<Sources>>;
  }

  return resolveFailableSources(sources).then((results) =>
    combineAllResults<Sources>(results)
  ) as TupleHasAsync<Sources> extends true
    ? Promise<Failable<AllReturnData<Sources>, AllTupleError<Sources>>>
    : Failable<AllReturnData<Sources>, AllTupleError<Sources>>;
}

/**
 * Wait for every source that resolves successfully and return a tuple of their
 * `Failable` results.
 *
 * If a source promise rejects before producing a `Failable`, the combinator
 * rejects unchanged. Wrap that boundary with `failable(...)` first if you want
 * the rejection converted into `Failure`.
 */
export function allSettled<const Sources extends readonly unknown[]>(
  ...sources: Sources & AllSettledSources<Sources>
): TupleHasAsync<Sources> extends true
  ? Promise<AllSettledTuple<Sources>>
  : AllSettledTuple<Sources> {
  if (!hasPromiseLikeSources(sources)) {
    return combineAllSettledResults<Sources>(
      sources.map((source) => toValidatedFailable(source))
    ) as TupleHasAsync<Sources> extends true
      ? Promise<AllSettledTuple<Sources>>
      : AllSettledTuple<Sources>;
  }

  return resolveFailableSources(sources).then((results) =>
    combineAllSettledResults<Sources>(results)
  ) as TupleHasAsync<Sources> extends true
    ? Promise<AllSettledTuple<Sources>>
    : AllSettledTuple<Sources>;
}

/**
 * Take the first `Failable` source to settle.
 *
 * When every source is already hydrated, the first source in input order wins
 * synchronously. When any source is promised, winner ordering follows normal
 * `Promise.race(...)` semantics for already-settled entries.
 */
export function race<const Sources extends readonly unknown[]>(
  ...sources: Sources & RaceSources<Sources>
): RaceReturn<Sources> {
  if (sources.length === 0) {
    return Promise.reject(
      new Error('`race()` requires at least one `Failable` source.')
    ) as RaceReturn<Sources>;
  }

  if (!hasPromiseLikeSources(sources)) {
    return toValidatedFailable(sources[0]) as RaceReturn<Sources>;
  }

  return Promise.race(sources.map((source) => Promise.resolve(source))).then(
    (result) =>
      toValidatedFailable(result) as Failable<
        RaceData<Sources>,
        RaceError<Sources>
      >
  ) as RaceReturn<Sources>;
}

type AsyncRunBuilder<
  Yield extends RunStep<unknown, unknown, unknown> = never,
  Result extends RunReturn = RunReturn
> = (_helpers: RunNoHelpers) => AsyncGenerator<Yield, Result, unknown>;

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

function finalizeRunResult<Yield, Result extends RunReturn>(
  result: Result
): InferRunResult<Yield, Result> {
  if (isFailable(result)) {
    return result as InferRunResult<Yield, Result>;
  }

  if (result === undefined) {
    return success() as InferRunResult<Yield, Result>;
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

type RunIteration<
  Yield extends RunYield,
  Result extends RunReturn
> = IteratorResult<Yield, Result>;

type SyncRunController<Yield extends RunYield, Result extends RunReturn> = {
  readonly next: (value?: unknown) => RunIteration<Yield, Result>;
  readonly unwind: (
    result: Failable<unknown, unknown>
  ) => RunIteration<Yield, Result>;
};

type AsyncRunController<Yield extends RunYield, Result extends RunReturn> = {
  readonly next: (value?: unknown) => Promise<RunIteration<Yield, Result>>;
  readonly unwind: (
    result: Failable<unknown, unknown>
  ) => Promise<RunIteration<Yield, Result>>;
};

function driveRunIterator<Yield extends RunYield, Result extends RunReturn>(
  controller: SyncRunController<Yield, Result>
): InferRunResult<Yield, Result>;
function driveRunIterator<Yield extends RunYield, Result extends RunReturn>(
  controller: AsyncRunController<Yield, Result>
): Promise<InferRunResult<Yield, Result>>;
function driveRunIterator<Yield extends RunYield, Result extends RunReturn>(
  controller:
    | SyncRunController<Yield, Result>
    | AsyncRunController<Yield, Result>
): InferRunResult<Yield, Result> | Promise<InferRunResult<Yield, Result>> {
  const continueRun = (
    iteration: RunIteration<Yield, Result>
  ): InferRunResult<Yield, Result> | Promise<InferRunResult<Yield, Result>> => {
    if (iteration.done) {
      return finalizeRunResult<Yield, Result>(iteration.value);
    }

    const source = readRunSource(iteration.value);
    if (source.status === FailableStatus.Failure) {
      return continueUnwind(controller.unwind(source), source);
    }

    return resolveStep(controller.next(source.data), continueRun);
  };

  const continueUnwind = (
    step: RunIteration<Yield, Result> | Promise<RunIteration<Yield, Result>>,
    unwindResult: Failable<unknown, unknown>
  ): InferRunResult<Yield, Result> | Promise<InferRunResult<Yield, Result>> =>
    resolveStep(step, (iteration) => {
      if (iteration.done) {
        return finalizeRunResult<Yield, Result>(iteration.value);
      }

      const source = readRunSource(iteration.value);
      if (source.status === FailableStatus.Failure) {
        return continueUnwind(controller.unwind(unwindResult), unwindResult);
      }

      return continueUnwind(controller.next(source.data), unwindResult);
    });

  return resolveStep(controller.next(), continueRun);
}

function resolveStep<Step, Result>(
  step: Step | Promise<Step>,
  onResolved: (value: Step) => Result | Promise<Result>
): Result | Promise<Result> {
  if (isPromiseLike(step)) {
    return step.then((value) => onResolved(value));
  }

  return onResolved(step);
}

export function run<
  Yield extends RunStep<unknown, unknown, unknown> = never,
  Result = RunReturn
>(
  builder: ((
    _helpers: RunNoHelpers
  ) => AsyncGenerator<Yield, Result, unknown>) &
    ValidateRunReturn<Result>
): Promise<InferRunResult<Yield, Extract<Result, RunReturn>>>;
export function run<Yield extends RunYield = never, Result = RunReturn>(
  builder: ((_helpers: RunNoHelpers) => Generator<Yield, Result, unknown>) &
    ValidateRunReturn<Result>
): InferRunResult<Yield, Extract<Result, RunReturn>>;
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
      unwind: (result) => iterator.return(result as never),
    });
  }

  return driveRunIterator({
    next: (value) =>
      (iterator as Generator<RunYield, RunReturn, unknown>).next(value),
    unwind: (result) =>
      (iterator as Generator<RunYield, RunReturn, unknown>).return(
        result as never
      ),
  });
}

export function failable<Result>(value: Success<Result>): Success<Result>;
export function failable<Reason>(value: Failure<Reason>): Failure<Reason>;
export function failable<Result, Reason>(
  value: Failable<Result, Reason>
): Failable<Result, Reason>;
export function failable<Result>(
  value: FailableLikeSuccess<Result>
): Success<Result>;
export function failable<Reason>(
  value: FailableLikeFailure<Reason>
): Failure<Reason>;
export function failable<Result, Reason>(
  value: FailableLike<Result, Reason>
): Failable<Result, Reason>;
/**
 * Capture the boundary you actually have:
 * - `failable(() => value)` for synchronous callbacks that may throw
 * - `await failable(promise)` for promise-based code that may reject
 * - `run(...)` when the steps already return `Failable`
 *
 * When you pass `toReason`, it only applies to raw thrown or rejected values.
 * Existing `Failable` / `FailableLike` inputs and pass-through return values are
 * already past the capture boundary and keep their existing reason channel.
 */
export function failable<Result>(value: Success<Result>): Success<Result>;
export function failable<Reason>(value: Failure<Reason>): Failure<Reason>;
export function failable<Result, Reason>(
  value: Failable<Result, Reason>
): Failable<Result, Reason>;
export function failable<Result>(
  value: FailableLikeSuccess<Result>
): Success<Result>;
export function failable<Reason>(
  value: FailableLikeFailure<Reason>
): Failure<Reason>;
export function failable<Result, Reason>(
  value: FailableLike<Result, Reason>
): Failable<Result, Reason>;
export function failable<
  PromiseSource extends PromiseLike<unknown>,
  const Reason
>(
  promise: PromiseSource &
    DisallowToReasonForResultLike<Awaited<PromiseSource>>,
  toReason: FailableToReasonInput<Reason>
): Promise<CaptureResult<Awaited<PromiseSource>, Reason>>;
export function failable<
  PromiseSource extends PromiseLike<unknown>,
  Reason = unknown
>(promise: PromiseSource): InferReturnTypeFromPromise<PromiseSource, Reason>;
export function failable<Callback extends () => unknown, const Reason>(
  callback: Callback & DisallowToReasonForResultLike<ReturnType<Callback>>,
  toReason: FailableToReasonInput<Reason>
): CaptureResult<ReturnType<Callback>, Reason>;
export function failable<Callback extends () => unknown, Reason = unknown>(
  callback: Callback
): InferFailableFromValue<ReturnType<Callback>, Reason>;
export function failable(
  value: FailableInput,
  toReason?: FailableToReasonInput<unknown>
) {
  if (isFailable(value)) {
    return value;
  }

  if (isFailableLike(value)) {
    return fromFailableLike(value);
  }

  if (isFunction(value)) {
    return fromFunction(value, toReason);
  }

  return fromPromise(value, toReason);
}

function fromFailableLike<Result, Reason>(
  failableLike: FailableLike<Result, Reason>
): Failable<Result, Reason> {
  if (failableLike.status === FailableStatus.Success) {
    return success(failableLike.data);
  }

  return failure(failableLike.error);
}

function fromFunction<
  Callback extends () => CallbackResult,
  Reason,
  CallbackResult = ReturnType<Callback>
>(callback: Callback, toReason?: FailableToReasonInput<Reason>) {
  try {
    const data = callback();

    if (isFailable(data)) {
      return data;
    }

    if (isFailableLike(data)) {
      return fromFailableLike(data);
    }

    return success(data);
  } catch (reason) {
    return captureFailure(reason, toReason);
  }
}

function fromPromise<PromiseSource extends PromiseLike<unknown>>(
  promise: PromiseSource,
  toReason?: FailableToReasonInput<unknown>
) {
  return Promise.resolve(promise).then(
    (data) => {
      if (isFailable(data)) {
        return data;
      }

      if (isFailableLike(data)) {
        return fromFailableLike(data);
      }

      return success(data);
    },
    (reason) => captureFailure(reason, toReason)
  );
}

function captureFailure<Reason>(
  reason: unknown,
  toReason?: FailableToReasonInput<Reason>
) {
  if (toReason === undefined) {
    return failure(reason as Reason);
  }

  if (isFunction(toReason)) {
    return failure(toReason(reason));
  }

  return failure(toReason);
}

const UNSTRINGIFIABLE_ERROR_MESSAGE = 'Unstringifiable error value';

function tryGetStringErrorMessage(value: unknown): string | null {
  try {
    return String(value);
  } catch {
    return null;
  }
}

function defaultToError(reason: unknown): Error {
  if (reason instanceof Error) return reason;

  return new Error(
    `Expected value to be Success. Received Failure(${
      tryGetStringErrorMessage(reason) ?? UNSTRINGIFIABLE_ERROR_MESSAGE
    }).`,
    { cause: reason }
  );
}
