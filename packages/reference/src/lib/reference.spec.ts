import { createReference } from './reference.js';

describe('Reference', () => {
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
      const ref = createReference('hello');
      ref.unset();
      expect(ref.getOr('fallback')).toBe('fallback');
    });

    it('calls and returns the fallback getter when unset', () => {
      const ref = createReference(10);
      ref.unset();
      expect(ref.getOr(() => 99)).toBe(99);
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
      const ref = createReference('x');
      ref.unset();
      expect(ref.getOrSet('new')).toBe('new');
      expect(ref.getOrThrow()).toBe('new');
    });

    it('calls the getter, sets, and returns the result when unset', () => {
      const ref = createReference(0);
      ref.unset();
      const getter = vi.fn(() => 42);
      expect(ref.getOrSet(getter)).toBe(42);
      expect(ref.getOrThrow()).toBe(42);
      expect(getter).toHaveBeenCalledOnce();
    });

    it('does not call the getter when set', () => {
      const ref = createReference(5);
      const getter = vi.fn(() => 10);
      ref.getOrSet(getter);
      expect(getter).not.toHaveBeenCalled();
    });

    it('accepts non-functional getOrSet inputs when T also includes a function member', () => {
      const ref = createReference('value' as string | (() => number));
      ref.unset();

      expect(ref.getOrSet('fallback')).toBe('fallback');
    });

    it('rejects function-valued getOrSet inputs for function references', () => {
      const ref = createReference(() => 1);

      // @ts-expect-error "Function values are reserved for lazy getters"
      ref.getOrSet(() => () => 2);
    });
  });
});

describe('ReadonlyReference', () => {
  it('accepts a precomputed value-or-getter union variable', () => {
    const ref = createReference('value');
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

  it('does not expose set, unset, getOrSet, or asReadonly', () => {
    const ref = createReference(1);
    const ro = ref.asReadonly();
    expect(ro).not.toHaveProperty('set');
    expect(ro).not.toHaveProperty('unset');
    expect(ro).not.toHaveProperty('getOrSet');
    expect(ro).not.toHaveProperty('asReadonly');
  });
});
