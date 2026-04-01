import {
  all,
  allSettled,
  failable,
  failure,
  FailableStatus,
  isFailable,
  isFailableLike,
  isFailure,
  isSuccess,
  race,
  run,
  success,
  throwIfFailure,
  toFailableLike,
  type Failable,
  type FailableLike,
  type FailableLikeFailure,
  type FailableLikeSuccess,
  type Failure,
  type Success,
} from '@pvorona/failable';

type Equal<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends <
  T
>() => T extends Right ? 1 : 2
  ? (<T>() => T extends Right ? 1 : 2) extends <T>() => T extends Left ? 1 : 2
    ? true
    : false
  : false;

function expectType<Condition extends true>(condition: Condition): void {
  void condition;
}

/** Avoid `>>` / `>>>` tokenization issues in nested `expectType<Equal<...>>` */
type PromiseFailable<T, E = unknown> = Promise<Failable<T, E>>;

type HasIterator<T> = typeof Symbol.iterator extends keyof T ? true : false;
type HasAsyncIterator<T> = typeof Symbol.asyncIterator extends keyof T
  ? true
  : false;

type ConsumerModule = typeof import('@pvorona/failable');
type ExpectedRuntimeExportName =
  | 'all'
  | 'allSettled'
  | 'FailableStatus'
  | 'failable'
  | 'failure'
  | 'isFailable'
  | 'isFailableLike'
  | 'isFailure'
  | 'isSuccess'
  | 'race'
  | 'run'
  | 'success'
  | 'throwIfFailure'
  | 'toFailableLike';

expectType<
  Equal<Exclude<keyof ConsumerModule, ExpectedRuntimeExportName>, never>
>(true);
expectType<
  Equal<Exclude<ExpectedRuntimeExportName, keyof ConsumerModule>, never>
>(true);
expectType<
  Equal<'FailableTag' extends keyof ConsumerModule ? true : false, false>
>(true);
expectType<
  Equal<'SuccessTag' extends keyof ConsumerModule ? true : false, false>
>(true);
expectType<
  Equal<'FailureTag' extends keyof ConsumerModule ? true : false, false>
>(true);
expectType<Equal<'RunGet' extends keyof ConsumerModule ? true : false, false>>(
  true
);
expectType<Equal<'get' extends keyof ConsumerModule ? true : false, false>>(
  true
);
expectType<
  Equal<
    'FailableNormalizeErrorOptions' extends keyof ConsumerModule ? true : false,
    false
  >
>(true);
expectType<
  Equal<'throwIfFailure' extends keyof ConsumerModule ? true : false, true>
>(true);

const ok = success(123);
const voidOk = success();
const explicitUndefinedOk = success(undefined);

expectType<Equal<typeof voidOk, Success<void>>>(true);
expectType<Equal<typeof explicitUndefinedOk, Success<undefined>>>(true);
void voidOk;
void explicitUndefinedOk;
expectType<Equal<HasIterator<Success<number>>, true>>(true);
expectType<Equal<HasAsyncIterator<Success<number>>, true>>(true);
expectType<Equal<HasIterator<Failure<string>>, true>>(true);
expectType<Equal<HasAsyncIterator<Failure<string>>, true>>(true);
expectType<Equal<HasIterator<Failable<number, string>>, true>>(true);
expectType<Equal<HasAsyncIterator<Failable<number, string>>, true>>(true);
// @ts-expect-error `success<T>()` still requires a value when `T` is explicit.
success<number>();

const okOrElse = ok.orElse(() => 456);
expectType<Equal<typeof okOrElse, Success<123>>>(true);

const okGetOrElse = ok.getOrElse(() => 456);
expectType<Equal<typeof okGetOrElse, 123>>(true);

const okGetOrThrow = ok.getOrThrow();
expectType<Equal<typeof okGetOrThrow, 123>>(true);

const okMatch = ok.match(
  (value) => value.toString(),
  () => 'unexpected'
);
expectType<Equal<typeof okMatch, string>>(true);

const okMixedMatch = ok.match(
  (value) => value.toString(),
  (error) => error
);
expectType<Equal<typeof okMixedMatch, string>>(true);

const status: FailableStatus = ok.status;
void status;
void FailableStatus.Success;

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error('normalized', { cause: error });

const okGetOrThrowCustom = ok.getOrThrow(toError);
expectType<Equal<typeof okGetOrThrowCustom, 123>>(true);

const okGetOrThrowDirectMessage = ok.getOrThrow('normalized');
expectType<Equal<typeof okGetOrThrowDirectMessage, 123>>(true);

const okGetOrThrowMessage = ok.getOrThrow(() => 'normalized');
expectType<Equal<typeof okGetOrThrowMessage, 123>>(true);

const problem = failure('boom');
const voidProblem = failure();
const explicitUndefinedProblem = failure(undefined);

expectType<Equal<typeof voidProblem, Failure<void>>>(true);
expectType<Equal<typeof explicitUndefinedProblem, Failure<undefined>>>(true);
void voidProblem;
void explicitUndefinedProblem;
// @ts-expect-error `failure<E>()` still requires a value when `E` is explicit.
failure<number>();

const problemOrElse = problem.orElse(() => 123);
expectType<Equal<typeof problemOrElse, Success<number>>>(true);

const problemOrElseFromError = problem.orElse((error) => error.length);
expectType<Equal<typeof problemOrElseFromError, Success<number>>>(true);

const problemGetOrElse = problem.getOrElse(() => 123);
expectType<Equal<typeof problemGetOrElse, number>>(true);

const problemGetOrElseFromError = problem.getOrElse((error) => error.length);
expectType<Equal<typeof problemGetOrElseFromError, number>>(true);

const problemGetOrThrow = () => problem.getOrThrow();
expectType<Equal<ReturnType<typeof problemGetOrThrow>, never>>(true);

const problemGetOrThrowCustom = () => problem.getOrThrow(toError);
expectType<Equal<ReturnType<typeof problemGetOrThrowCustom>, never>>(true);

const problemGetOrThrowDirectMessage = () => problem.getOrThrow('normalized');
expectType<Equal<ReturnType<typeof problemGetOrThrowDirectMessage>, never>>(
  true
);

const problemGetOrThrowMessage = () =>
  problem.getOrThrow((reason) => `normalized: ${reason}`);
expectType<Equal<ReturnType<typeof problemGetOrThrowMessage>, never>>(true);

const problemMatch = problem.match(
  () => 'unexpected',
  (error) => error
);
expectType<Equal<typeof problemMatch, 'boom'>>(true);

const problemMixedMatch = problem.match(
  () => 123,
  (error) => error.length
);
expectType<Equal<typeof problemMixedMatch, number>>(true);
expectType<
  Equal<'isError' extends keyof Success<number> ? true : false, false>
>(true);
expectType<
  Equal<'isError' extends keyof Failure<string> ? true : false, false>
>(true);
expectType<
  Equal<'isError' extends keyof Failable<number, string> ? true : false, false>
>(true);

const union: Failable<number, string> = Math.random() > 0.5 ? ok : problem;

if (union.isFailure) {
  expectType<Equal<typeof union.error, string>>(true);
} else {
  expectType<Equal<typeof union.data, number>>(true);
}

const maybeHydrated:
  | Success<number>
  | Failure<string>
  | { readonly nope: true } =
  Math.random() > 0.5 ? ok : Math.random() > 0.5 ? problem : { nope: true };

if (isFailable(maybeHydrated) && maybeHydrated.isFailure) {
  expectType<Equal<typeof maybeHydrated.error, string>>(true);
}

if (isSuccess(maybeHydrated)) {
  expectType<Equal<typeof maybeHydrated.data, number>>(true);
}

if (isFailure(maybeHydrated)) {
  expectType<Equal<typeof maybeHydrated.error, string>>(true);
}

const unionOrElse = union.orElse(() => ({ a: 1 }));
expectType<Equal<typeof unionOrElse, Success<number> | Success<{ a: number }>>>(
  true
);

const unionOrElseFromError = union.orElse((error) => ({ reason: error }));
expectType<
  Equal<
    typeof unionOrElseFromError,
    Success<number> | Success<{ reason: string }>
  >
>(true);

const unionGetOrElse = union.getOrElse(() => ({ b: 'b' }));
expectType<Equal<typeof unionGetOrElse, number | { b: string }>>(true);

const unionGetOrElseFromError = union.getOrElse((error) => ({ reason: error }));
expectType<Equal<typeof unionGetOrElseFromError, number | { reason: string }>>(
  true
);

const unionMatch = union.match(
  (value) => value.toString(),
  (error) => error
);
expectType<Equal<typeof unionMatch, string>>(true);

const unionMixedMatch = union.match(
  (value) => value.toString(),
  (error) => error.length
);
expectType<Equal<typeof unionMixedMatch, string | number>>(true);

const okMapped = ok.map((value) => value.toString());
expectType<Equal<typeof okMapped, Success<string>>>(true);

const problemMapped = problem.map(() => 123);
expectType<Equal<typeof problemMapped, Failure<'boom'>>>(true);

const unionMapped = union.map((value) => value.toString());
expectType<Equal<typeof unionMapped, Failable<string, string>>>(true);

const okMappedError = ok.mapError(() => ({ code: 'mapped-error' as const }));
expectType<Equal<typeof okMappedError, Success<123>>>(true);

const problemMappedError = problem.mapError((error) => error.length);
expectType<Equal<typeof problemMappedError, Failure<number>>>(true);

const unionMappedError = union.mapError((error) => ({ reason: error }));
expectType<
  Equal<typeof unionMappedError, Failable<number, { reason: string }>>
>(true);

const okFlatMapped = ok.flatMap((value) => success(value.toString()));
expectType<Equal<typeof okFlatMapped, Success<string>>>(true);

const okFlatMappedToFailure = ok.flatMap((value) =>
  failure({ code: 'mapped-error', value })
);
expectType<
  Equal<
    typeof okFlatMappedToFailure,
    Failure<{ readonly code: 'mapped-error'; readonly value: 123 }>
  >
>(true);

const problemFlatMapped = problem.flatMap(() => success(123));
expectType<Equal<typeof problemFlatMapped, Failure<'boom'>>>(true);

const unionFlatMapped = union.flatMap((value) =>
  value > 0 ? success(value.toString()) : failure({ code: 'mapped-error' })
);
expectType<
  Equal<
    typeof unionFlatMapped,
    Failable<string, string | { readonly code: 'mapped-error' }>
  >
>(true);

const readOkData = () => {
  throwIfFailure(ok);

  return ok.data;
};
expectType<Equal<ReturnType<typeof readOkData>, 123>>(true);

const ensureProblem = () => {
  throwIfFailure(problem);
};
expectType<Equal<ReturnType<typeof ensureProblem>, void>>(true);

const readEnsuredUnionData = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  throwIfFailure(result);

  const ensuredSuccess: Success<number> = result;
  void ensuredSuccess;

  return result.data;
};
expectType<Equal<ReturnType<typeof readEnsuredUnionData>, number>>(true);

const readUnionValue = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  return result.getOrThrow();
};
expectType<Equal<ReturnType<typeof readUnionValue>, number>>(true);

const readUnionValueWithCustomError = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  return result.getOrThrow(toError);
};
expectType<Equal<ReturnType<typeof readUnionValueWithCustomError>, number>>(
  true
);

const readUnionValueWithCustomMessage = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  return result.getOrThrow((reason) => `normalized: ${reason}`);
};
expectType<
  Equal<ReturnType<typeof readUnionValueWithCustomMessage>, number>
>(true);

const readUnionValueWithDirectMessage = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  return result.getOrThrow('normalized');
};
expectType<Equal<ReturnType<typeof readUnionValueWithDirectMessage>, number>>(
  true
);

const throwableArgUnion = success(123) as Failable<number, string>;
throwIfFailure(throwableArgUnion, toError);
throwIfFailure(throwableArgUnion, 'normalized');
throwIfFailure(throwableArgUnion, (reason) => `normalized: ${reason}`);

const mappedArgUnion = success(123) as Failable<
  number,
  { readonly code: 'boom' }
>;
throwIfFailure(mappedArgUnion, () => new Error('boom'));
throwIfFailure(mappedArgUnion, ({ code }) => code);

const mappedProblem = failure({ code: 'boom' });
mappedProblem.getOrThrow(() => new Error('boom'));
mappedProblem.getOrThrow('boom');
mappedProblem.getOrThrow(({ code }) => code);

const successWire = toFailableLike(ok);

if (!isFailableLike(successWire)) {
  throw new Error('Expected structured-clone success wire shape');
}

expectType<Equal<typeof successWire, FailableLikeSuccess<123>>>(true);

const successWireAsConsumerType: FailableLike<number, string> = successWire;
void successWireAsConsumerType;

const failureWire = toFailableLike(problem);

if (!isFailableLike(failureWire)) {
  throw new Error('Expected structured-clone failure wire shape');
}

expectType<Equal<typeof failureWire, FailableLikeFailure<'boom'>>>(true);

const failureWireAsConsumerType: FailableLike<number, string> = failureWire;
void failureWireAsConsumerType;

const wrappedSyncLiteral = failable(() => 123);
expectType<Equal<typeof wrappedSyncLiteral, Failable<number, unknown>>>(true);
void wrappedSyncLiteral;

type ConsumerPromiseFailableOf<T> = PromiseFailable<T>;

type ConsumerNumberOrPromiseNumber = number | Promise<number>;
declare const unionSyncOrPromise: () => ConsumerNumberOrPromiseNumber;
const wrappedAsyncLiteral = failable(async () => 123);
expectType<Equal<typeof wrappedAsyncLiteral, Failable<Promise<number>, unknown>>>(
  true
);

const wrappedPromiseReturningCallback = failable(() => Promise.resolve(123));
expectType<
  Equal<typeof wrappedPromiseReturningCallback, Failable<Promise<number>, unknown>>
>(true);

const wrappedUnionSyncOrPromise = failable(unionSyncOrPromise);
expectType<
  Equal<
    typeof wrappedUnionSyncOrPromise,
    Failable<number, unknown> | Failable<Promise<number>, unknown>
  >
>(true);

declare const unknownReturner: () => unknown;
const wrappedUnknownReturner = failable(unknownReturner);
expectType<Equal<typeof wrappedUnknownReturner, Failable<unknown, unknown>>>(
  true
);
void wrappedUnknownReturner;

const wrappedDirectPromise = failable(Promise.resolve(123));
expectType<
  Equal<typeof wrappedDirectPromise, ConsumerPromiseFailableOf<number>>
>(true);
void wrappedDirectPromise;

const fixedReasonFailure = failable(() => {
  throw { code: 'boom' };
}, 'invalid_config');
expectType<Equal<typeof fixedReasonFailure, Failure<'invalid_config'>>>(true);

const normalizedCustomFailure = failable(() => {
  throw { code: 'boom' };
}, (reason) => ({ code: 'invalid_config', cause: reason }));
expectType<
  Equal<
    typeof normalizedCustomFailure,
    Failure<{
      readonly code: 'invalid_config';
      readonly cause: unknown;
    }>
  >
>(true);

const normalizedRejectedValue = failable(
  Promise.reject('boom'),
  (reason) => ({ code: 'request_failed', cause: reason })
);
expectType<
  Equal<
    typeof normalizedRejectedValue,
    Promise<
      Failure<{
        readonly code: 'request_failed';
        readonly cause: unknown;
      }>
    >
  >
>(true);

// @ts-expect-error existing Failable inputs do not accept `toReason`.
failable(failure(['first', 'second']), 'invalid_config');

// @ts-expect-error returned hydrated `Failure` values do not accept `toReason`.
failable(() => failure('boom'), 'invalid_config');

// @ts-expect-error resolved hydrated `Failure` values do not accept `toReason`.
failable(Promise.resolve(failure('boom')), 'invalid_config');

const helperResult = (): Failable<'helper-data', 'helper-error'> =>
  success('helper-data');
const typedNeverSuccess: Success<never> = success(undefined as never);

// @ts-expect-error `run(...)` builders no longer receive helper arguments.
run(function* ({ get }) {
  void get;

  return success(123);
});

const runSuccess = run(function* () {
  const value = yield* success(123);

  return success(value);
});
expectType<Equal<typeof runSuccess, Success<123>>>(true);

const runDirectSuccess = run(function* () {
  const value = yield* success(123);

  return success(value);
});
expectType<Equal<typeof runDirectSuccess, Success<123>>>(true);

const runNoYieldSuccess = run(function* () {
  return success(42);
});
expectType<Equal<typeof runNoYieldSuccess, Success<42>>>(true);

const runNeverSuccess = run(function* () {
  return typedNeverSuccess;
});
expectType<Equal<typeof runNeverSuccess, Success<never>>>(true);

const runInlineFailure = run(function* () {
  const value = yield* failure('inline-error');

  return success(value);
});
expectType<Equal<typeof runInlineFailure, Failure<'inline-error'>>>(true);

const runDirectFailure = run(function* () {
  const value = yield* failure('inline-error');

  return success(value);
});
expectType<Equal<typeof runDirectFailure, Failure<'inline-error'>>>(true);

const runNeverSuccessWithYieldedError = run(function* () {
  const value = yield* success(123) as Failable<123, 'source-error'>;

  void value;
  return typedNeverSuccess;
});
const runNeverSuccessWithYieldedErrorAsFailable: Failable<
  never,
  'source-error'
> = runNeverSuccessWithYieldedError;
void runNeverSuccessWithYieldedErrorAsFailable;

const runDirectFailable = run(function* () {
  const value = yield* success(123) as Failable<123, 'source-error'>;

  return success(value);
});
expectType<Equal<typeof runDirectFailable, Failable<123, 'source-error'>>>(
  true
);

const runNeverSuccessWithGuaranteedFailureInYieldSet = run(function* () {
  const maybeValue = yield* success(123) as Failable<123, 'source-error'>;
  const guaranteedValue = yield* failure('inline-error');

  void maybeValue;
  void guaranteedValue;
  return typedNeverSuccess;
});
const runNeverSuccessWithGuaranteedFailureInYieldSetAsFailure: Failure<
  'source-error' | 'inline-error'
> = runNeverSuccessWithGuaranteedFailureInYieldSet;
void runNeverSuccessWithGuaranteedFailureInYieldSetAsFailure;

const runHelperReturn = run(function* () {
  return helperResult();
});
expectType<
  Equal<typeof runHelperReturn, Failable<'helper-data', 'helper-error'>>
>(true);

const runDirectHelper = run(function* () {
  const value = yield* helperResult();

  return success(value);
});
const runDirectHelperAsFailable: Failable<'helper-data', 'helper-error'> =
  runDirectHelper;
void runDirectHelperAsFailable;

const shouldUseString = true as boolean;

const runDistributed = run(function* () {
  const wrapper = shouldUseString
    ? (success('wrapped-string') as Failable<
        'wrapped-string',
        'wrapped-string-error'
      >)
    : (success(123) as Failable<123, 'wrapped-number-error'>);
  const value = yield* wrapper;

  return shouldUseString ? success(value) : failure('builder-error');
});
const runDistributedAsFailable: Failable<
  'wrapped-string' | 123,
  'wrapped-string-error' | 'wrapped-number-error' | 'builder-error'
> = runDistributed;
void runDistributedAsFailable;

const runAsyncSuccess = run(async function* () {
  const first = yield* success(123);
  const second = yield* await Promise.resolve(success('ready'));

  return success([first, second]);
});
expectType<
  Equal<typeof runAsyncSuccess, Promise<Success<readonly [123, 'ready']>>>
>(true);

const runAsyncDirectHelper = run(async function* () {
  const first = yield* helperResult();
  const second = yield* await Promise.resolve(success('ready'));

  return success([first, second]);
});
const runAsyncDirectHelperAsPromise: Promise<
  Failable<readonly ['helper-data', 'ready'], 'helper-error'>
> = runAsyncDirectHelper;
void runAsyncDirectHelperAsPromise;

const runAsyncDirectHydrated = run(async function* () {
  const directValue = yield* success(123);
  const directFailable = yield* success('ready') as Failable<
    'ready',
    'source-error'
  >;
  const promisedValue = yield* await Promise.resolve(success(true));

  return success([directValue, directFailable, promisedValue]);
});
expectType<
  Equal<
    typeof runAsyncDirectHydrated,
    PromiseFailable<readonly [123, 'ready', true], 'source-error'>
  >
>(true);

const runAsyncNeverSuccess = run(async function* () {
  return typedNeverSuccess;
});
expectType<Equal<typeof runAsyncNeverSuccess, Promise<Success<never>>>>(true);

const runAsyncFailure = run(async function* () {
  const value = yield* await Promise.resolve(failure('async-error'));

  return success(value);
});
expectType<Equal<typeof runAsyncFailure, Promise<Failure<'async-error'>>>>(
  true
);

const runAsyncDirectFailure = run(async function* () {
  const value = yield* failure('async-direct-error');

  return success(value);
});
expectType<
  Equal<typeof runAsyncDirectFailure, Promise<Failure<'async-direct-error'>>>
>(true);

const getAsyncUser = async (userId: string) => {
  if (userId === '') {
    return failure('missing-user-id');
  }

  if (userId === 'offline') {
    return failure('network-error');
  }

  return success({ id: userId });
};

const runAsyncPromisedSourceUnion = run(async function* () {
  const user = yield* await getAsyncUser('123');

  return success(user);
});
expectType<
  Equal<
    typeof runAsyncPromisedSourceUnion,
    Promise<
      Failable<{ readonly id: string }, 'missing-user-id' | 'network-error'>
    >
  >
>(true);
void runAsyncPromisedSourceUnion;

const syncAll = all(success(1), success('two'));
const syncAllAsFailable: Failable<readonly [1, 'two'], never> = syncAll;
void syncAllAsFailable;

const mixedAll = all(success(1), Promise.resolve(success('two')));
const mixedAllAsPromise: Promise<Failable<readonly [1, 'two'], never>> =
  mixedAll;
void mixedAllAsPromise;

const maybeAsyncSource:
  | Failable<number, string>
  | Promise<Failable<number, string>> =
  Math.random() > 0.5 ? success(1) : Promise.resolve(success(1));

const maybeAsyncAll = all(maybeAsyncSource);
expectType<
  Equal<typeof maybeAsyncAll, Promise<Failable<readonly [number], string>>>
>(true);

const settledAll = allSettled(
  Promise.resolve(success(1)),
  Promise.resolve(failure('boom'))
);
const settledAllAsPromise: Promise<readonly [Success<1>, Failure<'boom'>]> =
  settledAll;
void settledAllAsPromise;

const maybeAsyncSettled = allSettled(maybeAsyncSource);
expectType<
  Equal<typeof maybeAsyncSettled, Promise<readonly [Failable<number, string>]>>
>(true);

// @ts-expect-error `allSettled(...)` rejects obvious bare `Promise.reject(...)` inputs.
allSettled(Promise.reject('boom'));

const syncRacedResult = race(success(1), failure('boom'));
const syncRacedResultAsFailable: Failable<1, 'boom'> = syncRacedResult;
void syncRacedResultAsFailable;

const racedResult = race(success(1), Promise.resolve(failure('boom')));
const racedResultAsPromise: Promise<Failable<1, 'boom'>> = racedResult;
void racedResultAsPromise;

const maybeAsyncRace = race(maybeAsyncSource);
expectType<Equal<typeof maybeAsyncRace, Promise<Failable<number, string>>>>(
  true
);

// @ts-expect-error `race(...)` rejects obvious bare `Promise.reject(...)` inputs.
race(Promise.reject('boom'));

const runAsyncHelperReturn = run(async function* () {
  return helperResult();
});
expectType<
  Equal<
    typeof runAsyncHelperReturn,
    PromiseFailable<'helper-data', 'helper-error'>
  >
>(true);

const runAsyncThrowOnly = run(async function* () {
  throw new Error('boom');
});
expectType<Equal<typeof runAsyncThrowOnly, Promise<never>>>(true);

// @ts-expect-error `run(...)` async builders no longer receive combinator helpers.
run(async function* ({ all: runAll }) {
  const [value] = yield* await runAll(Promise.resolve(success(123)));

  return success(value);
});

run(function* () {
  // @ts-expect-error sync `run(...)` builders only accept hydrated `Failable` values.
  const value = yield* Promise.resolve(success(123));

  return success(value);
});

run(async function* () {
  // @ts-expect-error promised sources must be awaited before `yield*`.
  const value = yield* Promise.resolve(success(123));

  return success(value);
});

run(async function* () {
  // @ts-expect-error direct `yield*` does not accept promised `Failable` sources.
  const value = yield* Promise.resolve(success(123));

  return success(value);
});

// @ts-expect-error `run(...)` builders must return a `Failable`.
run(function* () {
  return 123;
});

// @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
run(function* () {
  return {
    status: FailableStatus.Success,
    data: 123 as const,
    error: null,
    match: ((onSuccess: (value: 123) => 123) =>
      onSuccess(123)) as Success<123>['match'],
  };
});

// @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
run(function* () {
  return {
    status: FailableStatus.Failure,
    data: null,
    error: 'boom' as const,
    match: ((
      _: (value: never) => 'boom',
      onFailure: (value: 'boom') => 'boom'
    ) => onFailure('boom')) as Failure<'boom'>['match'],
  };
});

// @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
run(async function* () {
  return {
    status: FailableStatus.Success,
    data: 123 as const,
    error: null,
    match: ((onSuccess: (value: 123) => 123) =>
      onSuccess(123)) as Success<123>['match'],
  };
});

// @ts-expect-error `run(...)` builders must return hydrated `Failable` values only.
run(async function* () {
  return {
    status: FailableStatus.Failure,
    data: null,
    error: 'boom' as const,
    match: ((
      _: (value: never) => 'boom',
      onFailure: (value: 'boom') => 'boom'
    ) => onFailure('boom')) as Failure<'boom'>['match'],
  };
});

const singleSyncRace = race(success(123));
const singleSyncRaceAsFailable: Failable<123, never> = singleSyncRace;
void singleSyncRaceAsFailable;

const runEmpty = run(function* () {
  return;
});
expectType<Equal<typeof runEmpty, Success<void>>>(true);

void okOrElse;
void okGetOrElse;
void okGetOrThrow;
void okMatch;
void okMixedMatch;
void explicitUndefinedOk;
void voidOk;
void problemOrElse;
void problemOrElseFromError;
void problemGetOrElse;
void problemGetOrElseFromError;
void problemMixedMatch;
void unionMixedMatch;
void problemGetOrThrow;
void problemMatch;
void explicitUndefinedProblem;
void voidProblem;
void unionOrElse;
void unionOrElseFromError;
void unionGetOrElse;
void unionGetOrElseFromError;
void unionMatch;
void okMapped;
void problemMapped;
void unionMapped;
void okFlatMapped;
void okFlatMappedToFailure;
void problemFlatMapped;
void unionFlatMapped;
void readOkData;
void ensureProblem;
void readEnsuredUnionData;
void readUnionValue;
void okGetOrThrowCustom;
void okGetOrThrowDirectMessage;
void okGetOrThrowMessage;
void problemGetOrThrowCustom;
void problemGetOrThrowDirectMessage;
void problemGetOrThrowMessage;
void readUnionValueWithCustomError;
void readUnionValueWithCustomMessage;
void readUnionValueWithDirectMessage;
void throwableArgUnion;
void mappedArgUnion;
void mappedProblem;
void wrappedSyncLiteral;
void wrappedAsyncLiteral;
void wrappedPromiseReturningCallback;
void wrappedUnionSyncOrPromise;
void wrappedUnknownReturner;
void wrappedDirectPromise;
void fixedReasonFailure;
void normalizedCustomFailure;
void normalizedRejectedValue;
void runSuccess;
void runDirectSuccess;
void runEmpty;
void runNoYieldSuccess;
void runNeverSuccess;
void runInlineFailure;
void runDirectFailure;
void runNeverSuccessWithYieldedError;
void runDirectFailable;
void runNeverSuccessWithGuaranteedFailureInYieldSet;
void runHelperReturn;
void runDirectHelper;
void runDistributed;
void runAsyncSuccess;
void runAsyncDirectHelper;
void runAsyncDirectHydrated;
void runAsyncNeverSuccess;
void runAsyncFailure;
void runAsyncDirectFailure;
void syncAll;
void mixedAll;
void maybeAsyncAll;
void settledAll;
void maybeAsyncSettled;
void racedResult;
void maybeAsyncRace;
void runAsyncHelperReturn;
void runAsyncThrowOnly;
