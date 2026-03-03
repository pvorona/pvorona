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
});
