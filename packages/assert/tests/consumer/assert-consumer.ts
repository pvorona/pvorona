import {
  assert,
  ensureArray,
  ensureNever,
  ensureNotNullOrUndefined,
  hasOwnPropertyValue,
  isNull,
  isNullOrUndefined,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
  type AssertionFailure,
} from '@pvorona/assert';

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

type ConsumerModule = typeof import('@pvorona/assert');
expectType<
  Equal<
    'resolveValueOrGetter' extends keyof ConsumerModule ? true : false,
    false
  >
>(true);
expectType<
  Equal<
    'ensureNonEmptyArray' extends keyof ConsumerModule ? true : false,
    false
  >
>(true);

const envPort =
  Math.random() > 0.5 ? '3000' : Math.random() > 0.5 ? null : undefined;
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

const boundaryString = (Math.random() > 0.5 ? 'port' : 42) as unknown;
if (isString(boundaryString)) {
  expectType<Equal<typeof boundaryString, string>>(true);
}

const legacyGenericString = 'port' as string | number;
if (isString<string | number, string | number>(legacyGenericString)) {
  expectType<Equal<typeof legacyGenericString, string>>(true);
} else {
  expectType<Equal<typeof legacyGenericString, number>>(true);
}

const boundaryNumber = (Math.random() > 0.5 ? 3000 : 'port') as unknown;
if (isNumber(boundaryNumber)) {
  expectType<Equal<typeof boundaryNumber, number>>(true);
}

const legacyGenericNumber = 3000 as string | number;
if (isNumber<string | number, string | number>(legacyGenericNumber)) {
  expectType<Equal<typeof legacyGenericNumber, number>>(true);
} else {
  expectType<Equal<typeof legacyGenericNumber, string>>(true);
}

const boundaryNull = (Math.random() > 0.5 ? null : 'value') as unknown;
if (isNull(boundaryNull)) {
  expectType<Equal<typeof boundaryNull, null>>(true);
}

const legacyGenericNull = null as string | null;
if (isNull<string | null, string | null>(legacyGenericNull)) {
  expectType<Equal<typeof legacyGenericNull, null>>(true);
} else {
  expectType<Equal<typeof legacyGenericNull, string>>(true);
}

const boundaryUndefined = (
  Math.random() > 0.5 ? undefined : 'value'
) as unknown;
if (isUndefined(boundaryUndefined)) {
  expectType<Equal<typeof boundaryUndefined, undefined>>(true);
}

const legacyGenericUndefined = undefined as string | undefined;
if (
  isUndefined<string | undefined, string | undefined>(legacyGenericUndefined)
) {
  expectType<Equal<typeof legacyGenericUndefined, undefined>>(true);
} else {
  expectType<Equal<typeof legacyGenericUndefined, string>>(true);
}

const boundaryNullish = (Math.random() > 0.5 ? undefined : 'value') as unknown;
if (isNullOrUndefined(boundaryNullish)) {
  expectType<Equal<typeof boundaryNullish, null | undefined>>(true);
}

const legacyGenericNullish = undefined as string | null | undefined;
if (
  isNullOrUndefined<string | null | undefined, string | null | undefined>(
    legacyGenericNullish
  )
) {
  expectType<Equal<typeof legacyGenericNullish, null | undefined>>(true);
} else {
  expectType<Equal<typeof legacyGenericNullish, string>>(true);
}

const boundarySymbol = (
  Math.random() > 0.5 ? Symbol('status') : 'status'
) as unknown;
if (isSymbol(boundarySymbol)) {
  expectType<Equal<typeof boundarySymbol, symbol>>(true);
}

const legacyGenericSymbol = Symbol('status') as string | symbol;
if (isSymbol<string | symbol, string | symbol>(legacyGenericSymbol)) {
  expectType<Equal<typeof legacyGenericSymbol, symbol>>(true);
} else {
  expectType<Equal<typeof legacyGenericSymbol, string>>(true);
}

// `any` is intentional here to verify the boundary-input contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyString = 'port' as any;
if (isString(anyString)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectType<Equal<typeof anyString, any>>(true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyNumber = 3000 as any;
if (isNumber(anyNumber)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectType<Equal<typeof anyNumber, any>>(true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyNull = null as any;
if (isNull(anyNull)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectType<Equal<typeof anyNull, any>>(true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyUndefined = undefined as any;
if (isUndefined(anyUndefined)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectType<Equal<typeof anyUndefined, any>>(true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyNullish = undefined as any;
if (isNullOrUndefined(anyNullish)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectType<Equal<typeof anyNullish, any>>(true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anySymbol = Symbol('status') as any;
if (isSymbol(anySymbol)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectType<Equal<typeof anySymbol, any>>(true);
}

const failure: AssertionFailure = () => 'Expected uppercase result';
assert(format('port') === 'PORT', failure);

// @ts-expect-error ensureNever only accepts never
ensureNever('value');

const silentNeverValue =
  // @ts-expect-error ensureNever only accepts never
  ensureNever('value', true);

const values = ['1', '2'] as readonly string[] | string;
const ensuredValues = ensureArray(values);
const lengths = ensuredValues.map((value) => Number(value));
expectType<Equal<typeof ensuredValues, readonly string[]>>(true);
expectType<Equal<typeof lengths, number[]>>(true);

void lengths;
void requiredPort;
void silentNeverValue;
