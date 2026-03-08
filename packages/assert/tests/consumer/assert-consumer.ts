import {
  assert,
  ensureNonEmptyArray,
  ensureNotNullOrUndefined,
  hasOwnPropertyValue,
  isString,
  type NonEmptyArray,
  type ReadonlyNonEmptyArray,
} from '@pvorona/assert';

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

type ConsumerModule = typeof import('@pvorona/assert');
expectType<
  Equal<'resolveValueOrGetter' extends keyof ConsumerModule ? true : false, false>
>(true);

const envPort =
  Math.random() > 0.5
    ? '3000'
    : Math.random() > 0.5
      ? null
      : undefined;
const port = ensureNotNullOrUndefined(envPort);
const requiredPort: string = port;

const result: unknown = { status: 'success', value: 42 };

if (hasOwnPropertyValue(result, 'status', 'success')) {
  const narrowedResult: Record<'status', string> = result;

  void narrowedResult;
}

function format(value: string | number): string {
  if (!isString(value)) return String(value);

  return value.toUpperCase();
}

assert(format('port') === 'PORT', 'Expected uppercase result');

const values: readonly string[] = ['1', '2'];
const ensuredValues = ensureNonEmptyArray(values);
const lengths = ensuredValues.map((value) => Number(value));
expectType<Equal<typeof ensuredValues, ReadonlyNonEmptyArray<string>>>(true);
expectType<Equal<typeof lengths, NonEmptyArray<number>>>(true);

void lengths;
void requiredPort;
