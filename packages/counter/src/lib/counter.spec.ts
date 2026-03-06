import { createCounter } from './counter.js';

describe('createCounter', () => {
  it('should start at 0 by default', () => {
    expect(createCounter().value).toBe(0);
  });

  it('should accept an initial value', () => {
    expect(createCounter(10).value).toBe(10);
  });

  it('should increment by 1 by default', () => {
    const counter = createCounter();
    expect(counter.increment()).toBe(1);
    expect(counter.value).toBe(1);
  });

  it('should increment by a given amount', () => {
    const counter = createCounter(5);
    expect(counter.increment(3)).toBe(8);
    expect(counter.value).toBe(8);
  });

  it('should decrement by 1 by default', () => {
    const counter = createCounter(5);
    expect(counter.decrement()).toBe(4);
    expect(counter.value).toBe(4);
  });

  it('should decrement by a given amount', () => {
    const counter = createCounter(10);
    expect(counter.decrement(4)).toBe(6);
    expect(counter.value).toBe(6);
  });

  it('should set a specific value', () => {
    const counter = createCounter();
    counter.set(42);
    expect(counter.value).toBe(42);
  });

  it('should return the assigned value from set', () => {
    const counter = createCounter();

    expect(counter.set(42)).toBe(42);
    expect(counter.value).toBe(42);
  });

  it('should reset to the original initial value', () => {
    const counter = createCounter(10);

    counter.increment(5);
    counter.set(99);

    expect(counter.reset()).toBe(10);
    expect(counter.value).toBe(10);
  });
});
