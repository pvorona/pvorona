type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key];
};

const COUNTER_BASE = {
  value: 0,
  increment(amount = 1) {
    return (this.value += amount);
  },
  decrement(amount = 1) {
    return (this.value -= amount);
  },
  set(value: number) {
    this.value = value;
  },
};

export type Counter = {
  readonly value: number;
  increment(amount?: number): number;
  decrement(amount?: number): number;
  set(value: number): void;
};

export function createCounter(initialValue = 0): Counter {
  const counter: Mutable<Counter> = Object.create(COUNTER_BASE);
  counter.value = initialValue;
  return counter;
}
