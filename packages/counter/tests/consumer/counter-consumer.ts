import { createCounter, type Counter } from '@pvorona/counter';

const counter = createCounter(5);
const currentValue: number = counter.value;
const incremented: number = counter.increment();
const decremented: number = counter.decrement(2);
const resetValue: number = counter.reset();

function reset(counterValue: Counter) {
  counterValue.reset();
}

reset(counter);

void currentValue;
void incremented;
void decremented;
void resetValue;
