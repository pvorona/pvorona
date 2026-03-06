import type { Mutable } from './Mutable.js';

test('Mutable', () => {
  type Config = {
    readonly retries: number;
    readonly label: string;
  };

  expectTypeOf<Mutable<Config>>().toEqualTypeOf<{
    retries: number;
    label: string;
  }>();
});
