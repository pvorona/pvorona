import { isError } from './index.js';

test('root barrel exports isError', () => {
  const value = new Error('boom') as unknown;

  expect(isError(value)).toBe(true);
});
