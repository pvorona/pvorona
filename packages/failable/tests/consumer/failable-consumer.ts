import {
  failable,
  failure,
  FailableStatus,
  isFailable,
  isFailableLike,
  isFailure,
  isSuccess,
  NormalizedErrors,
  run,
  success,
  throwIfError,
  toFailableLike,
  type FailableNormalizeErrorOptions,
  type Failable,
  type FailableLike,
  type FailableLikeFailure,
  type FailableLikeSuccess,
  type Failure,
  type Success,
} from '@pvorona/failable';

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
        (<T>() => T extends Left ? 1 : 2)
      ? true
      : false
    : false;

function expectType<Condition extends true>(condition: Condition): void {
  void condition;
}

type ConsumerModule = typeof import('@pvorona/failable');
type ExpectedRuntimeExportName =
  | 'FailableStatus'
  | 'NormalizedErrors'
  | 'failable'
  | 'failure'
  | 'isFailable'
  | 'isFailableLike'
  | 'isFailure'
  | 'isSuccess'
  | 'run'
  | 'success'
  | 'throwIfError'
  | 'toFailableLike';

expectType<Equal<Exclude<keyof ConsumerModule, ExpectedRuntimeExportName>, never>>(
  true
);
expectType<Equal<Exclude<ExpectedRuntimeExportName, keyof ConsumerModule>, never>>(
  true
);
expectType<Equal<'FailableTag' extends keyof ConsumerModule ? true : false, false>>(
  true
);
expectType<Equal<'SuccessTag' extends keyof ConsumerModule ? true : false, false>>(
  true
);
expectType<Equal<'FailureTag' extends keyof ConsumerModule ? true : false, false>>(
  true
);
expectType<Equal<'RunGet' extends keyof ConsumerModule ? true : false, false>>(
  true
);
expectType<Equal<'get' extends keyof ConsumerModule ? true : false, false>>(true);
expectType<
  Equal<
    'FailableNormalizeErrorOptions' extends keyof ConsumerModule
      ? true
      : false,
    false
  >
>(true);
expectType<Equal<'throwIfError' extends keyof ConsumerModule ? true : false, true>>(
  true
);

const ok = success(123);
const voidOk = success();
const explicitUndefinedOk = success(undefined);

expectType<Equal<typeof voidOk, Success<void>>>(true);
expectType<Equal<typeof explicitUndefinedOk, Success<undefined>>>(true);
// @ts-expect-error `success<T>()` still requires a value when `T` is explicit.
success<number>();

const okOrElse = ok.orElse(() => 456);
expectType<Equal<typeof okOrElse, Success<number>>>(true);

const okGetOrElse = ok.getOrElse(() => 456);
expectType<Equal<typeof okGetOrElse, number>>(true);

const okGetOrThrow = ok.getOrThrow();
expectType<Equal<typeof okGetOrThrow, number>>(true);

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

const problem = failure('boom');
const voidProblem = failure();
const explicitUndefinedProblem = failure(undefined);

expectType<Equal<typeof voidProblem, Failure<void>>>(true);
expectType<Equal<typeof explicitUndefinedProblem, Failure<undefined>>>(true);
// @ts-expect-error `failure<E>()` still requires a value when `E` is explicit.
failure<number>();

const problemOrElse = problem.orElse(() => 123);
expectType<Equal<typeof problemOrElse, Success<number>>>(true);

const problemGetOrElse = problem.getOrElse(() => 123);
expectType<Equal<typeof problemGetOrElse, number>>(true);

const problemGetOrThrow = () => problem.getOrThrow();
expectType<Equal<ReturnType<typeof problemGetOrThrow>, never>>(true);

const problemMatch = problem.match(
  () => 'unexpected',
  (error) => error
);
expectType<Equal<typeof problemMatch, string>>(true);
expectType<Equal<'isError' extends keyof Success<number> ? true : false, false>>(
  true
);
expectType<Equal<'isError' extends keyof Failure<string> ? true : false, false>>(
  true
);
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
  | { readonly nope: true } = Math.random() > 0.5
  ? ok
  : Math.random() > 0.5
  ? problem
  : { nope: true };

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
expectType<
  Equal<typeof unionOrElse, Success<number> | Success<{ a: number }>>
>(true);

const unionGetOrElse = union.getOrElse(() => ({ b: 'b' }));
expectType<Equal<typeof unionGetOrElse, number | { b: string }>>(true);

const unionMatch = union.match(
  (value) => value.toString(),
  (error) => error
);
expectType<Equal<typeof unionMatch, string>>(true);

const readOkData = () => {
  throwIfError(ok);

  return ok.data;
};
expectType<Equal<ReturnType<typeof readOkData>, number>>(true);

const ensureProblem = () => {
  throwIfError(problem);
};
expectType<Equal<ReturnType<typeof ensureProblem>, void>>(true);

const readEnsuredUnionData = () => {
  const result: Failable<number, string> =
    Math.random() > 0.5 ? success(123) : failure('boom');

  throwIfError(result);

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

const normalizedArgUnion = success(123) as Failable<number, string>;
// @ts-expect-error `throwIfError(...)` does not accept normalization options.
throwIfError(normalizedArgUnion, NormalizedErrors);

const mappedArgUnion = success(123) as Failable<number, { readonly code: 'boom' }>;
// @ts-expect-error `throwIfError(...)` does not accept mapper callbacks.
throwIfError(mappedArgUnion, () => new Error('boom'));

const successWire = toFailableLike(ok);

if (!isFailableLike(successWire)) {
  throw new Error('Expected structured-clone success wire shape');
}

expectType<Equal<typeof successWire, FailableLikeSuccess<number>>>(true);

const successWireAsConsumerType: FailableLike<number, string> = successWire;
void successWireAsConsumerType;

const failureWire = toFailableLike(problem);

if (!isFailableLike(failureWire)) {
  throw new Error('Expected structured-clone failure wire shape');
}

expectType<Equal<typeof failureWire, FailableLikeFailure<string>>>(true);

const failureWireAsConsumerType: FailableLike<number, string> = failureWire;
void failureWireAsConsumerType;

const wrappedFunction = failable(() => 123);
expectType<Equal<typeof wrappedFunction, Failable<number, unknown>>>(true);

// @ts-expect-error `failable(() => ...)` accepts sync callbacks only.
failable(async () => 123);

// @ts-expect-error `failable(() => ...)` accepts sync callbacks only.
failable(() => Promise.resolve(123));

const wrappedPromise = failable(Promise.resolve(123));
expectType<
  Equal<typeof wrappedPromise, Promise<Failable<number, unknown>>>
>(true);

const normalizedExplicitFailure = failable(
  failure(['first', 'second']),
  NormalizedErrors
);
expectType<Equal<typeof normalizedExplicitFailure, Failure<Error>>>(true);

const normalizedCustomFailure = failable(
  () => {
    throw { code: 'boom' };
  },
  normalizeOptions
);
expectType<Equal<typeof normalizedCustomFailure, Failure<Error>>>(true);

const normalizedRejectedValue = failable(
  Promise.reject('boom' as const),
  normalizeOptions
);
expectType<Equal<typeof normalizedRejectedValue, Promise<Failure<Error>>>>(true);

const helperResult = (): Failable<'helper-data', 'helper-error'> =>
  success('helper-data' as const);
const typedNeverSuccess: Success<never> = success(undefined as never);

const runSuccess = run(function* ({ get }) {
  const value = yield* get(success(123 as const));

  return success(value);
});
expectType<Equal<typeof runSuccess, Success<123>>>(true);

const runNoYieldSuccess = run(function* () {
  return success(42 as const);
});
expectType<Equal<typeof runNoYieldSuccess, Success<42>>>(true);

const runNeverSuccess = run(function* () {
  return typedNeverSuccess;
});
expectType<Equal<typeof runNeverSuccess, Success<never>>>(true);

const runInlineFailure = run(function* ({ get }) {
  const value = yield* get(failure('inline-error' as const));

  return success(value);
});
expectType<Equal<typeof runInlineFailure, Failure<'inline-error'>>>(true);

const runNeverSuccessWithYieldedError = run(function* ({ get }) {
  const value = yield* get(
    success(123 as const) as Failable<123, 'source-error'>
  );

  void value;
  return typedNeverSuccess;
});
expectType<
  Equal<typeof runNeverSuccessWithYieldedError, Failable<never, 'source-error'>>
>(true);

const runNeverSuccessWithGuaranteedFailureInYieldSet = run(function* ({ get }) {
  const maybeValue = yield* get(
    success(123 as const) as Failable<123, 'source-error'>
  );
  const guaranteedValue = yield* get(failure('inline-error' as const));

  void maybeValue;
  void guaranteedValue;
  return typedNeverSuccess;
});
expectType<
  Equal<
    typeof runNeverSuccessWithGuaranteedFailureInYieldSet,
    Failure<'source-error' | 'inline-error'>
  >
>(true);

const runHelperReturn = run(function* () {
  return helperResult();
});
expectType<
  Equal<typeof runHelperReturn, Failable<'helper-data', 'helper-error'>>
>(true);

const shouldUseString = true as boolean;

const runDistributed = run(function* ({ get }) {
  const wrapper = shouldUseString
    ? get(
        success('wrapped-string' as const) as Failable<
          'wrapped-string',
          'wrapped-string-error'
        >
      )
    : get(
        success(123 as const) as Failable<123, 'wrapped-number-error'>
      );
  const value = yield* wrapper;

  return shouldUseString ? success(value) : failure('builder-error' as const);
});
expectType<
  Equal<
    typeof runDistributed,
    Failable<
      'wrapped-string' | 123,
      'wrapped-string-error' | 'wrapped-number-error' | 'builder-error'
    >
  >
>(true);

const runAsyncSuccess = run(async function* ({ get }) {
  const first = yield* get(success(123 as const));
  const second = yield* get(Promise.resolve(success('ready' as const)));

  return success([first, second] as const);
});
expectType<
  Equal<typeof runAsyncSuccess, Promise<Success<readonly [123, 'ready']>>>
>(true);

const runAsyncNeverSuccess = run(async function* () {
  return typedNeverSuccess;
});
expectType<Equal<typeof runAsyncNeverSuccess, Promise<Success<never>>>>(true);

const runAsyncFailure = run(async function* ({ get }) {
  const value = yield* get(Promise.resolve(failure('async-error' as const)));

  return success(value);
});
expectType<
  Equal<typeof runAsyncFailure, Promise<Failure<'async-error'>>>
>(true);

const getAsyncUser = async (userId: string) => {
  if (userId === '') {
    return failure('missing-user-id' as const);
  }

  if (userId === 'offline') {
    return failure('network-error' as const);
  }

  return success({ id: userId } as const);
};

const runAsyncPromisedSourceUnion = run(async function* ({ get }) {
  const user = yield* get(getAsyncUser('123'));

  return success(user);
});
expectType<
  Equal<
    typeof runAsyncPromisedSourceUnion,
    Promise<
      Failable<
        { readonly id: string },
        'missing-user-id' | 'network-error'
      >
    >
  >
>(true);
void runAsyncPromisedSourceUnion;

const runAsyncHelperReturn = run(async function* () {
  return helperResult();
});
expectType<
  Equal<
    typeof runAsyncHelperReturn,
    Promise<Failable<'helper-data', 'helper-error'>>
  >
>(true);

const runAsyncThrowOnly = run(async function* () {
  throw new Error('boom');
});
expectType<Equal<typeof runAsyncThrowOnly, Promise<never>>>(true);

run(function* ({ get }) {
  // @ts-expect-error sync `run(...)` does not accept promised `get(...)` sources.
  const value = yield* get(Promise.resolve(success(123 as const)));

  return success(value);
});

// @ts-expect-error `run(...)` builders must return a `Failable`.
run(function* () {
  return 123 as const;
});

const runEmpty = run(function* () {
  return;
});
expectType<Equal<typeof runEmpty, Success<void>>>(true);

void okOrElse;
void okGetOrElse;
void okGetOrThrow;
void okMatch;
void problemOrElse;
void problemGetOrElse;
void problemGetOrThrow;
void problemMatch;
void unionOrElse;
void unionGetOrElse;
void unionMatch;
void readOkData;
void ensureProblem;
void readEnsuredUnionData;
void readUnionValue;
void normalizedArgUnion;
void mappedArgUnion;
void wrappedFunction;
void wrappedPromise;
void normalizedExplicitFailure;
void normalizedCustomFailure;
void normalizedRejectedValue;
void runSuccess;
void runEmpty;
void runNoYieldSuccess;
void runNeverSuccess;
void runInlineFailure;
void runNeverSuccessWithYieldedError;
void runNeverSuccessWithGuaranteedFailureInYieldSet;
void runHelperReturn;
void runDistributed;
void runAsyncSuccess;
void runAsyncNeverSuccess;
void runAsyncFailure;
void runAsyncHelperReturn;
void runAsyncThrowOnly;
