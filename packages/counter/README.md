# @pvorona/counter

A tiny mutable counter.

## Install

```bash
npm i @pvorona/counter
```

## Usage

```ts
import { createCounter } from '@pvorona/counter';

const counter = createCounter(5);

counter.value; // 5
counter.increment(); // 6
counter.set(20); // 20
counter.reset(); // 5
counter.value; // 5
```

## API

### `type Counter`

Public counter interface.

```ts
export type Counter = {
  readonly value: number;
  increment(amount?: number): number;
  decrement(amount?: number): number;
  set(value: number): number;
  reset(): number;
};
```

Notes:

- `value` is the current count.
- `increment(amount?)` adds `amount` (defaults to `1`) and returns the updated value.
- `decrement(amount?)` subtracts `amount` (defaults to `1`) and returns the updated value.
- `set(value)` replaces the current value and returns it.
- `reset()` restores the original `initialValue` and returns it.

Example:

```ts
import type { Counter } from '@pvorona/counter';

function reset(counter: Counter) {
  counter.reset();
}
```

### `createCounter(initialValue?: number): Counter`

Creates a new counter.

- **`initialValue`**: starting value (defaults to `0`)
- **returns**: a `Counter`

Example:

```ts
import { createCounter } from '@pvorona/counter';

const clicks = createCounter();
clicks.increment(); // 1
```
