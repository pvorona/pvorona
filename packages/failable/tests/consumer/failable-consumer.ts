import {
  createFailable,
  failure,
  FailableStatus,
  isFailure,
  isSuccess,
  NormalizedErrors,
  success,
  type Failable,
  type Failure,
  type Success,
} from '@pvorona/failable';

type Expect<T extends true> = T;

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
        (<T>() => T extends Left ? 1 : 2)
      ? true
      : false
    : false;

type ConsumerModule = typeof import('@pvorona/failable');

type _NoFailableTag = Expect<
  Equal<'FailableTag' extends keyof ConsumerModule ? true : false, false>
>;
type _NoSuccessTag = Expect<
  Equal<'SuccessTag' extends keyof ConsumerModule ? true : false, false>
>;
type _NoFailureTag = Expect<
  Equal<'FailureTag' extends keyof ConsumerModule ? true : false, false>
>;

const ok = success(123);

const okOrElse = ok.orElse(() => 456);
type _OkOrElse = Expect<Equal<typeof okOrElse, Success<number>>>;

const okGetOrElse = ok.getOrElse(() => 456);
type _OkGetOrElse = Expect<Equal<typeof okGetOrElse, number>>;

const okMatch = ok.match(
  (value) => value.toString(),
  () => 'unexpected'
);
type _OkMatch = Expect<Equal<typeof okMatch, string>>;

if (!isSuccess(ok)) {
  throw new Error('Expected success result');
}

const status: FailableStatus = ok.status;
void status;
void FailableStatus.Success;

const problem = failure('boom');

const problemOrElse = problem.orElse(() => 123);
type _ProblemOrElse = Expect<Equal<typeof problemOrElse, Success<number>>>;

const problemGetOrElse = problem.getOrElse(() => 123);
type _ProblemGetOrElse = Expect<Equal<typeof problemGetOrElse, number>>;

const problemMatch = problem.match(
  () => 'unexpected',
  (error) => error
);
type _ProblemMatch = Expect<Equal<typeof problemMatch, string>>;

if (!isFailure(problem)) {
  throw new Error('Expected failure result');
}

const union: Failable<number, string> = Math.random() > 0.5 ? ok : problem;

const unionOrElse = union.orElse(() => ({ a: 1 }));
type _UnionOrElse = Expect<
  Equal<typeof unionOrElse, Success<number> | Success<{ a: number }>>
>;

const unionGetOrElse = union.getOrElse(() => ({ b: 'b' }));
type _UnionGetOrElse = Expect<
  Equal<typeof unionGetOrElse, number | { b: string }>
>;

const unionMatch = union.match(
  (value) => value.toString(),
  (error) => error
);
type _UnionMatch = Expect<Equal<typeof unionMatch, string>>;

const wrappedFunction = createFailable(() => 123);

type _WrappedFunctionDefaultsToUnknown = Expect<
  Equal<typeof wrappedFunction, Failable<number, unknown>>
>;

const wrappedPromise = createFailable(Promise.resolve(123));

type _WrappedPromiseDefaultsToUnknown = Expect<
  Equal<typeof wrappedPromise, Promise<Failable<number, unknown>>>
>;

const normalizedExplicitFailure = createFailable(
  failure(['first', 'second']),
  NormalizedErrors
);
type _NormalizedExplicitFailure = Expect<
  Equal<typeof normalizedExplicitFailure, Failure<Error>>
>;

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
type _NormalizedCustomFailure = Expect<
  Equal<typeof normalizedCustomFailure, Failure<Error>>
>;
