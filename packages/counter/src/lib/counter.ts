import type { Mutable } from '@pvorona/types';

export type Counter = {
  readonly value: number;
  increment(amount?: number): number;
  decrement(amount?: number): number;
  set(value: number): number;
  reset(): number;
};

type CounterState = Mutable<Counter> & {
  initialValue: number;
};

const COUNTER_BASE = {
  value: 0,
  increment(this: CounterState, amount = 1) {
    return (this.value += amount);
  },
  decrement(this: CounterState, amount = 1) {
    return (this.value -= amount);
  },
  set(this: CounterState, value: number) {
    this.value = value;
    return this.value;
  },
  reset(this: CounterState) {
    return this.set(this.initialValue);
  },
} satisfies Omit<CounterState, 'initialValue'>;

export function createCounter(initialValue = 0): Counter {
  const counter: CounterState = Object.create(COUNTER_BASE);
  counter.initialValue = initialValue;
  counter.value = initialValue;
  return counter;
}
