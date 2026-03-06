# @pvorona/counter

A tiny mutable counter.

## Install

```bash
npm i @pvorona/counter
```

## Usage

```ts
import { createCounter } from '@pvorona/counter';

const counter = createCounter(10);

counter.value; // 10
counter.increment(); // 11
counter.increment(2); // 13
counter.decrement(); // 12
counter.set(0);
counter.value; // 0
```

## API

### `type Counter`

Public counter interface.

```ts
export type Counter = {
  readonly value: number;
  increment(amount?: number): number;
  decrement(amount?: number): number;
  set(value: number): void;
};
```

Notes:

- `value` is the current count.
- `increment(amount?)` adds `amount` (defaults to `1`) and returns the updated value.
- `decrement(amount?)` subtracts `amount` (defaults to `1`) and returns the updated value.
- `set(value)` replaces the current value.

Example:

```ts
import type { Counter } from '@pvorona/counter';

function reset(counter: Counter) {
  counter.set(0);
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
