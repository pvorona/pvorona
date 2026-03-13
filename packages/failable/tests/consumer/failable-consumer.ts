import {
  createFailable,
  failure,
  FailableStatus,
  isFailableLike,
  isFailure,
  isSuccess,
  NormalizedErrors,
  run,
  success,
  toFailableLike,
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

const ok = success(123);

const okOrElse = ok.orElse(() => 456);
expectType<Equal<typeof okOrElse, Success<number>>>(true);

const okGetOrElse = ok.getOrElse(() => 456);
expectType<Equal<typeof okGetOrElse, number>>(true);

const okMatch = ok.match(
  (value) => value.toString(),
  () => 'unexpected'
);
expectType<Equal<typeof okMatch, string>>(true);

if (!isSuccess(ok)) {
  throw new Error('Expected success result');
}

const status: FailableStatus = ok.status;
void status;
void FailableStatus.Success;

const problem = failure('boom');

const problemOrElse = problem.orElse(() => 123);
expectType<Equal<typeof problemOrElse, Success<number>>>(true);

const problemGetOrElse = problem.getOrElse(() => 123);
expectType<Equal<typeof problemGetOrElse, number>>(true);

const problemMatch = problem.match(
  () => 'unexpected',
  (error) => error
);
expectType<Equal<typeof problemMatch, string>>(true);

if (!isFailure(problem)) {
  throw new Error('Expected failure result');
}

const union: Failable<number, string> = Math.random() > 0.5 ? ok : problem;

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

const wrappedFunction = createFailable(() => 123);
expectType<Equal<typeof wrappedFunction, Failable<number, unknown>>>(true);

const wrappedPromise = createFailable(Promise.resolve(123));
expectType<
  Equal<typeof wrappedPromise, Promise<Failable<number, unknown>>>
>(true);

const normalizedExplicitFailure = createFailable(
  failure(['first', 'second']),
  NormalizedErrors
);
expectType<Equal<typeof normalizedExplicitFailure, Failure<Error>>>(true);

const normalizedCustomFailure = createFailable(
  () => {
    throw { code: 'boom' };
  },
  {
    normalizeError(error: unknown) {
      return error instanceof Error
        ? error
        : new Error('normalized', { cause: error });
    },
  }
);
expectType<Equal<typeof normalizedCustomFailure, Failure<Error>>>(true);

const helperResult = (): Failable<'helper-data', 'helper-error'> =>
  success('helper-data' as const);

const runSuccess = run(function* ({ get }) {
  const value = yield* get(success(123 as const));

  return success(value);
});
expectType<Equal<typeof runSuccess, Success<123>>>(true);

const runNoYieldSuccess = run(function* () {
  return success(42 as const);
});
expectType<Equal<typeof runNoYieldSuccess, Success<42>>>(true);

const runInlineFailure = run(function* ({ get }) {
  const value = yield* get(failure('inline-error' as const));

  return success(value);
});
expectType<Equal<typeof runInlineFailure, Failure<'inline-error'>>>(true);

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
void okMatch;
void problemOrElse;
void problemGetOrElse;
void problemMatch;
void unionOrElse;
void unionGetOrElse;
void unionMatch;
void wrappedFunction;
void wrappedPromise;
void normalizedExplicitFailure;
void normalizedCustomFailure;
void runSuccess;
void runEmpty;
void runNoYieldSuccess;
void runInlineFailure;
void runHelperReturn;
void runDistributed;
