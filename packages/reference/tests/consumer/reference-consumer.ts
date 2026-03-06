import {
  createReference,
  createUnsetReference,
  type ReadonlyReference,
  type Reference,
} from '@pvorona/reference';

const storedUndefined: Reference<string | undefined> =
  createReference<string | undefined>(undefined);
const emptyToken = createUnsetReference<string>();
const tokenValue: string = emptyToken.getOrSet(() => 'abc');

const mode = createUnsetReference<'dev' | 'prod'>();
const readonlyMode: ReadonlyReference<'dev' | 'prod'> = mode.asReadonly();

mode.set('prod');
readonlyMode.getOr('dev');

void storedUndefined;
void tokenValue;
