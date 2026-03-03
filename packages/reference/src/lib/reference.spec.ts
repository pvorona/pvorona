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
  });
});
