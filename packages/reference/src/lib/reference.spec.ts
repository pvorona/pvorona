import {
  createReference,
  createUnsetReference,
  type ReadonlyReference,
  type Reference,
} from './reference.js';

describe('Reference', () => {
  describe('empty state contract', () => {
    it('createUnsetReference starts unset', () => {
      const ref = createUnsetReference<string>();

      expect(ref.isSet).toBe(false);
      expect(ref.isUnset).toBe(true);
      expect(ref.getOr('fallback')).toBe('fallback');
    });

    it('createReference starts set when the stored value is undefined', () => {
      const ref = createReference<string | undefined>(undefined);

      expect(ref.isSet).toBe(true);
      expect(ref.isUnset).toBe(false);
      expect(ref.getOr('fallback')).toBeUndefined();
    });

    it('createReference starts set when the stored value is null', () => {
      const ref = createReference<string | null>(null);

      expect(ref.isSet).toBe(true);
      expect(ref.isUnset).toBe(false);
      expect(ref.getOr('fallback')).toBeNull();
    });

    it('tracks set and unset transitions on mutable and readonly views', () => {
      const ref = createUnsetReference<number>();
      const readonlyRef = ref.asReadonly();

      expect(ref.isSet).toBe(false);
      expect(ref.isUnset).toBe(true);
      expect(readonlyRef.isSet).toBe(false);
      expect(readonlyRef.isUnset).toBe(true);

      ref.set(1);

      expect(ref.isSet).toBe(true);
      expect(ref.isUnset).toBe(false);
      expect(readonlyRef.isSet).toBe(true);
      expect(readonlyRef.isUnset).toBe(false);

      ref.unset();

      expect(ref.isSet).toBe(false);
      expect(ref.isUnset).toBe(true);
      expect(readonlyRef.isSet).toBe(false);
      expect(readonlyRef.isUnset).toBe(true);
    });
  });

  describe('getOr', () => {
    it('returns the stored value when set, ignoring the fallback value', () => {
      const ref = createReference('hello');
      expect(ref.getOr('fallback')).toBe('hello');
    });

    it('returns the stored value when set, without calling the fallback getter', () => {
      const ref = createReference(42);
      const getter = vi.fn(() => 0);
      expect(ref.getOr(getter)).toBe(42);
      expect(getter).not.toHaveBeenCalled();
    });

    it('returns the fallback value when unset', () => {
      const ref = createUnsetReference<string>();
      expect(ref.getOr('fallback')).toBe('fallback');
    });

    it('calls and returns the fallback getter when unset', () => {
      const ref = createUnsetReference<number>();
      const getter = vi.fn(() => 99);

      expect(ref.getOr(getter)).toBe(99);
      expect(getter).toHaveBeenCalledOnce();
    });
  });

  describe('getOrThrow', () => {
    it('returns the stored value when set', () => {
      const ref = createReference('value');
      expect(ref.getOrThrow()).toBe('value');
    });

    it('throws with a default message when unset and no argument given', () => {
      const ref = createReference('x');
      ref.unset();
      expect(() => ref.getOrThrow()).toThrow();
    });

    it('throws with the provided message string when unset', () => {
      const ref = createReference(1);
      ref.unset();
      expect(() => ref.getOrThrow('custom error')).toThrow('custom error');
    });

    it('throws with the message from the factory when unset', () => {
      const ref = createReference(1);
      ref.unset();
      expect(() => ref.getOrThrow(() => 'lazy error')).toThrow('lazy error');
    });
  });

  describe('set', () => {
    it('overwrites the current value', () => {
      const ref = createReference('a');
      ref.set('b');
      expect(ref.getOr('fallback')).toBe('b');
    });

    it('restores a value after unset', () => {
      const ref = createReference(1);
      ref.unset();
      ref.set(2);
      expect(ref.getOrThrow()).toBe(2);
    });
  });

  describe('getOrSet', () => {
    it('returns the stored value without changing it when set', () => {
      const ref = createReference('original');
      expect(ref.getOrSet('replacement')).toBe('original');
      expect(ref.getOr('fallback')).toBe('original');
    });

    it('sets and returns the fallback value when unset', () => {
      const ref = createUnsetReference<string>();
      expect(ref.getOrSet('new')).toBe('new');
      expect(ref.getOrThrow()).toBe('new');
    });

    it('calls the getter, sets, and returns the result when unset', () => {
      const ref = createUnsetReference<number>();
      const getter = vi.fn(() => 42);
      expect(ref.getOrSet(getter)).toBe(42);
      expect(ref.getOrThrow()).toBe(42);
      expect(getter).toHaveBeenCalledOnce();
    });

    it('accepts a precomputed value-or-getter union variable when unset', () => {
      const ref = createUnsetReference<string>();
      const fallback = Math.random() > 0.5 ? 'new' : () => 'new';

      expect(ref.getOrSet(fallback)).toBe('new');
    });

    it('does not call the getter when set', () => {
      const ref = createReference(5);
      const getter = vi.fn(() => 10);
      ref.getOrSet(getter);
      expect(getter).not.toHaveBeenCalled();
    });
  });

  describe('function guards', () => {
    it('throws when createReference receives a function from a JS or any caller', () => {
      const createReferenceFromUntyped = createReference as (
        value: unknown,
      ) => unknown;

      expect(() => createReferenceFromUntyped(() => 'value')).toThrow(
        /function/i,
      );
    });

    it('throws when createReference receives a constructor from a JS or any caller', () => {
      class ExampleClass {}

      const createReferenceFromUntyped = createReference as (
        value: unknown,
      ) => unknown;

      expect(() => createReferenceFromUntyped(ExampleClass)).toThrow(
        /function/i,
      );
    });

    it('throws when set receives a function from a JS or any caller', () => {
      const ref = createReference('value');
      const setFromUntyped = ref.set as (value: unknown) => void;

      expect(() => setFromUntyped(() => 'next')).toThrow(/function/i);
    });

    it('throws when getOr receives a constructor from a JS or any caller', () => {
      class ExampleClass {}

      const ref = createUnsetReference<string>();
      const getOrFromUntyped = ref.getOr as (valueOrGetter: unknown) => unknown;

      expect(() => getOrFromUntyped(ExampleClass)).toThrow(/function/i);
    });

    it('throws when a getOr fallback getter resolves to a function', () => {
      const ref = createUnsetReference<string>();
      const getOrFromUntyped = ref.getOr as (valueOrGetter: unknown) => unknown;

      expect(() => getOrFromUntyped(() => (() => 'value'))).toThrow(
        /function/i,
      );
    });
    it('throws when a lazy initializer resolves to a function', () => {
      const ref = createUnsetReference<string>();
      const getOrSetFromUntyped = ref.getOrSet as (
        valueOrGetter: unknown,
      ) => unknown;

      expect(() => getOrSetFromUntyped(() => (() => 'value'))).toThrow(
        /function/i,
      );
    });

    it('throws when getOrSet receives a constructor from a JS or any caller', () => {
      class ExampleClass {}

      const ref = createUnsetReference<string>();
      const getOrSetFromUntyped = ref.getOrSet as (
        valueOrGetter: unknown,
      ) => unknown;

      expect(() => getOrSetFromUntyped(ExampleClass)).toThrow(/function/i);
    });
  });

  describe('types', () => {
    it('exposes the expected public type surface', () => {
      const ref = createReference('value');
      const readonlyRef = ref.asReadonly();

      expectTypeOf(ref.getOr(123)).toEqualTypeOf<string | number>();
      expectTypeOf(ref.getOr(() => 123)).toEqualTypeOf<string | number>();
      expectTypeOf(ref.getOrSet('next')).toEqualTypeOf<string>();
      expectTypeOf(readonlyRef).toEqualTypeOf<ReadonlyReference<string>>();
      expectTypeOf(ref.isSet).toEqualTypeOf<boolean>();
      expectTypeOf(ref.isUnset).toEqualTypeOf<boolean>();
      expectTypeOf(readonlyRef.isSet).toEqualTypeOf<boolean>();
      expectTypeOf(readonlyRef.isUnset).toEqualTypeOf<boolean>();
    });
  });
});

describe('ReadonlyReference', () => {
  it('accepts a precomputed value-or-getter union variable when unset', () => {
    const ref = createReference('a');
    ref.unset();

    const fallback = Math.random() > 0.5 ? 'fallback' : () => 'fallback';

    expect(ref.asReadonly().getOr(fallback)).toBe('fallback');
  });

  it('exposes getOr that reflects the current value', () => {
    const ref = createReference('a');
    const ro = ref.asReadonly();
    expect(ro.getOr('fallback')).toBe('a');

    ref.set('b');
    expect(ro.getOr('fallback')).toBe('b');
  });

  it('exposes getOrThrow that reflects the current value', () => {
    const ref = createReference(1);
    const ro = ref.asReadonly();
    expect(ro.getOrThrow()).toBe(1);

    ref.unset();
    expect(() => ro.getOrThrow()).toThrow();
  });

  it('exposes live isSet and isUnset flags', () => {
    const ref = createUnsetReference<number>();
    const ro = ref.asReadonly();

    expect(ro.isSet).toBe(false);
    expect(ro.isUnset).toBe(true);

    ref.set(1);

    expect(ro.isSet).toBe(true);
    expect(ro.isUnset).toBe(false);

    ref.unset();

    expect(ro.isSet).toBe(false);
    expect(ro.isUnset).toBe(true);
  });

  it('does not expose set, unset, getOrSet, or asReadonly', () => {
    const ref = createReference(1);
    const ro = ref.asReadonly();
    expect(ro).not.toHaveProperty('set');
    expect(ro).not.toHaveProperty('unset');
    expect(ro).not.toHaveProperty('getOrSet');
    expect(ro).not.toHaveProperty('asReadonly');
  });
});

void (() => {
  const functionValue = () => 'value';
  class ExampleClass {}

  // @ts-expect-error Functions are reserved for lazy getters and cannot be stored.
  createReference(functionValue);

  // @ts-expect-error Constructors are function-valued and cannot be stored.
  createReference(ExampleClass);

  // @ts-expect-error Unset references cannot be parameterized with functions.
  createUnsetReference<() => void>();

  // @ts-expect-error Unset references cannot be parameterized with constructors.
  createUnsetReference<typeof ExampleClass>();

  // @ts-expect-error Functional references are rejected at the type level.
  const invalidReference: Reference<() => void> = createReference(functionValue);

  // @ts-expect-error Constructor-valued references are rejected at the type level.
  const invalidConstructorReference: Reference<typeof ExampleClass> = createReference(ExampleClass);

  // @ts-expect-error Passing a stored function to set is not supported.
  invalidReference.set(functionValue);

  // @ts-expect-error Passing a stored constructor to set is not supported.
  invalidConstructorReference.set(ExampleClass);
});
