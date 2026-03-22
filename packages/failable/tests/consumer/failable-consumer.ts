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
  NormalizedErrors,
  race,
  run,
  success,
  throwIfFailure,
  toFailableLike,
  type FailableNormalizeErrorOptions,
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
  | 'NormalizedErrors'
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

const status: FailableStatus = ok.status;
void status;
void FailableStatus.Success;

const normalizeOptions = {
  normalizeError(error: unknown) {
    return error instanceof Error
      ? error
      : new Error('normalized', { cause: error });
  },
} satisfies FailableNormalizeErrorOptions;

const okGetOrThrowNormalized = ok.getOrThrow(NormalizedErrors);
expectType<Equal<typeof okGetOrThrowNormalized, 123>>(true);

const okGetOrThrowCustom = ok.getOrThrow(normalizeOptions);
expectType<Equal<typeof okGetOrThrowCustom, 123>>(true);

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

const problemGetOrThrowNormalized = () => problem.getOrThrow(NormalizedErrors);
expectType<Equal<ReturnType<typeof problemGetOrThrowNormalized>, never>>(true);

const problemGetOrThrowCustom = () => problem.getOrThrow(normalizeOptions);
expectType<Equal<ReturnType<typeof problemGetOrThrowCustom>, never>>(true);

const problemMatch = problem.match(
  () => 'unexpected',
  (error) => error
);
expectType<Equal<typeof problemMatch, string>>(true);
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

const okMapped = ok.map((value) => value.toString());
expectType<Equal<typeof okMapped, Success<string>>>(true);

const problemMapped = problem.map(() => 123);
expectType<Equal<typeof problemMapped, Failure<'boom'>>>(true);

const unionMapped = union.map((value) => value.toString());
expectType<Equal<typeof unionMapped, Failable<string, string>>>(true);

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

const readUnionValueWithNormalizedErrors = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  return result.getOrThrow(NormalizedErrors);
};
expectType<
  Equal<ReturnType<typeof readUnionValueWithNormalizedErrors>, number>
>(true);

const readUnionValueWithCustomNormalization = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  return result.getOrThrow(normalizeOptions);
};
expectType<
  Equal<ReturnType<typeof readUnionValueWithCustomNormalization>, number>
>(true);

const normalizedArgUnion = success(123) as Failable<number, string>;
throwIfFailure(normalizedArgUnion, NormalizedErrors);
throwIfFailure(normalizedArgUnion, normalizeOptions);

const mappedArgUnion = success(123) as Failable<
  number,
  { readonly code: 'boom' }
>;
// @ts-expect-error `throwIfFailure(...)` does not accept mapper callbacks.
throwIfFailure(mappedArgUnion, () => new Error('boom'));

const mappedProblem = failure({ code: 'boom' });
// @ts-expect-error `getOrThrow()` does not accept mapper callbacks.
mappedProblem.getOrThrow(() => new Error('boom'));

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
// @ts-expect-error `failable(() => ...)` accepts sync callbacks only.
failable(async () => 123);

// @ts-expect-error `failable(() => ...)` accepts sync callbacks only.
failable(() => Promise.resolve(123));

// @ts-expect-error `failable(() => ...)` accepts sync callbacks only.
failable(unionSyncOrPromise);

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

const normalizedExplicitFailure = failable(
  failure(['first', 'second']),
  NormalizedErrors
);
expectType<Equal<typeof normalizedExplicitFailure, Failure<Error>>>(true);

const normalizedCustomFailure = failable(() => {
  throw { code: 'boom' };
}, normalizeOptions);
expectType<Equal<typeof normalizedCustomFailure, Failure<Error>>>(true);

const normalizedRejectedValue = failable(
  Promise.reject('boom'),
  normalizeOptions
);
expectType<Equal<typeof normalizedRejectedValue, Promise<Failure<Error>>>>(
  true
);

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
void explicitUndefinedOk;
void voidOk;
void problemOrElse;
void problemOrElseFromError;
void problemGetOrElse;
void problemGetOrElseFromError;
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
void okGetOrThrowNormalized;
void okGetOrThrowCustom;
void problemGetOrThrowNormalized;
void problemGetOrThrowCustom;
void readUnionValueWithNormalizedErrors;
void readUnionValueWithCustomNormalization;
void normalizedArgUnion;
void mappedArgUnion;
void mappedProblem;
void wrappedSyncLiteral;
void wrappedUnknownReturner;
void wrappedDirectPromise;
void normalizedExplicitFailure;
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
