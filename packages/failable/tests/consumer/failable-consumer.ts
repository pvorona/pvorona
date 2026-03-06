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

if (!isSuccess(ok)) {
  throw new Error('Expected success result');
}

const status: FailableStatus = ok.status;
void status;
void FailableStatus.Success;

const problem = failure('boom');

if (!isFailure(problem)) {
  throw new Error('Expected failure result');
}

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
