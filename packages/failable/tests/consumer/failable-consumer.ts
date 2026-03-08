import {
  createFailable,
  failure,
  FailableStatus,
  isFailableLike,
  isFailure,
  isSuccess,
  NormalizedErrors,
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
