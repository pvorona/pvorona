import { createReference, createUnsetReference } from '../dist/index.js';

describe('public surface', () => {
  it('distinguishes stored undefined from an unset reference', () => {
    const storedUndefined = createReference(undefined);
    const emptyToken = createUnsetReference();

    expect(storedUndefined.isSet).toBe(true);
    expect(storedUndefined.getOr('fallback')).toBeUndefined();
    expect(emptyToken.isUnset).toBe(true);
    expect(emptyToken.getOr('fallback')).toBe('fallback');
  });

  it('supports lazy initialization through getOrSet', () => {
    let createCount = 0;
    const connection = createUnsetReference<{ readonly id: string }>();

    const first = connection.getOrSet(() => {
      createCount += 1;
      return { id: 'first' };
    });
    const second = connection.getOrSet(() => {
      createCount += 1;
      return { id: 'second' };
    });

    expect(first).toBe(second);
    expect(connection.isSet).toBe(true);
    expect(createCount).toBe(1);
  });

  it('exposes a live readonly view', () => {
    const mode = createUnsetReference<'dev' | 'prod'>();
    const readonlyMode = mode.asReadonly();

    mode.set('prod');

    expect(readonlyMode.isSet).toBe(true);
    expect(readonlyMode.getOr('dev')).toBe('prod');
  });
});
