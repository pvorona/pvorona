# @pvorona/counter

A tiny mutable counter with a minimal, typed API.

## Install

```bash
npm i @pvorona/counter
```

## Usage

```ts
import { createCounter } from '@pvorona/counter';

const counter = createCounter();

counter.increment(); // 1
counter.increment(2); // 3
counter.decrement(); // 2
counter.value; // 2
```

### A common pattern: keep internal mutability, expose readonly `value`

```ts
import type { Counter } from '@pvorona/counter';
import { createCounter } from '@pvorona/counter';

export function makeRateLimiter(): Pick<Counter, 'increment' | 'value'> {
  const c = createCounter(0);
  return c;
}
```

## API

### `type Counter`

The public counter interface.

```ts
export type Counter = {
  readonly value: number;
  increment(amount?: number): number;
  decrement(amount?: number): number;
  set(value: number): void;
};
```

Example:

```ts
import type { Counter } from '@pvorona/counter';

function resetToZero(counter: Counter) {
  counter.set(0);
}
```

### `createCounter(initialValue?: number): Counter`

Creates a new counter instance.

- **`initialValue`**: initial value (defaults to `0`)
- **returns**: a `Counter` with a mutable internal value

Example:

```ts
import { createCounter } from '@pvorona/counter';

const counter = createCounter(10);
counter.decrement(3); // 7
```
