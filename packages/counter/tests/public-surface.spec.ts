import { createCounter } from '../dist/index.js';

describe('public surface', () => {
  it('supports the README usage example', () => {
    const counter = createCounter(5);

    expect(counter.value).toBe(5);
    expect(counter.increment()).toBe(6);
    expect(counter.set(20)).toBe(20);
    expect(counter.reset()).toBe(5);
    expect(counter.value).toBe(5);
  });

  it('supports the default constructor semantics', () => {
    const counter = createCounter();

    expect(counter.value).toBe(0);
    expect(counter.increment()).toBe(1);
    expect(counter.decrement()).toBe(0);
  });
});
