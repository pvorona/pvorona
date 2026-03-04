# @pvorona/duration

An immutable duration type with unit conversions, comparisons, and basic arithmetic.

## Install

```bash
npm i @pvorona/duration
```

## Usage

### Create and convert

```ts
import { Duration } from '@pvorona/duration';

const d = Duration.ofMinutes(5);
d.toSeconds(); // 300
d.toMilliSeconds(); // 300_000
```

### Compare

```ts
import { Duration } from '@pvorona/duration';

const a = Duration.ofSeconds(1);
const b = Duration.ofMilliSeconds(900);

a.greaterThan(b); // true
a.compare(b); // 1
```

### Arithmetic

```ts
import { Duration } from '@pvorona/duration';

const total = Duration.add(Duration.ofSeconds(1), Duration.ofMilliSeconds(500));
total.toMilliSeconds(); // 1500
```

### Between dates

```ts
import { Duration } from '@pvorona/duration';

const startedAt = new Date(Date.now() - 2_000);
const elapsed = Duration.since(startedAt);
elapsed.toSeconds(); // ~2
```

## API

### `const enum TimeUnit`

Time units supported by `Duration.of(value, unit)` and `duration.to(unit)`.

```ts
export const enum TimeUnit {
  MilliSecond,
  Second,
  Minute,
  Hour,
  Day,
  Week,
  Month,
  Year,
}
```

Notes:

- `Month` is treated as **30 days**
- `Year` is treated as **365.25 days**

Example:

```ts
import { Duration, TimeUnit } from '@pvorona/duration';

Duration.of(2, TimeUnit.Hour).toMinutes(); // 120
```

### `type Duration`

An opaque, immutable duration value.

#### Properties

- **`isFinite: boolean`**: `true` unless the duration is infinite
- **`isInfinite: boolean`**: `true` for `Duration.ofInfinite`
- **`isInstant: boolean`**: `true` for zero duration (`Duration.ofInstant`)

#### Conversions

- **`to(unit: TimeUnit): number`**: convert to an arbitrary unit
- **`toMilliSeconds(): number`**
- **`toSeconds(): number`**
- **`toMinutes(): number`**
- **`toHours(): number`**
- **`toDays(): number`**
- **`toWeeks(): number`**
- **`toMonths(): number`** (30-day months)
- **`toYears(): number`** (365.25-day years)

#### Comparisons

- **`equals(other: Duration): boolean`**
- **`lessThan(other: Duration): boolean`**
- **`lessThanOrEqual(other: Duration): boolean`**
- **`greaterThan(other: Duration): boolean`**
- **`greaterThanOrEqual(other: Duration): boolean`**
- **`compare(other: Duration): -1 | 0 | 1`**

Example (properties + conversion + comparison):

```ts
import type { Duration } from '@pvorona/duration';
import { Duration as DurationNS } from '@pvorona/duration';

function isShort(d: Duration) {
  return d.isFinite && d.toSeconds() < 5;
}

const a = DurationNS.ofSeconds(1);
const b = DurationNS.ofMilliSeconds(900);

isShort(a); // true
a.greaterThan(b); // true
```

### `const Duration`

Namespace-style factory + utilities.

#### Constructors

- **`Duration.of(value: number, unit: TimeUnit): Duration`**
- **`Duration.ofMilliSeconds(value: number): Duration`**
- **`Duration.ofSeconds(value: number): Duration`**
- **`Duration.ofMinutes(value: number): Duration`**
- **`Duration.ofHours(value: number): Duration`**
- **`Duration.ofDays(value: number): Duration`**
- **`Duration.ofWeeks(value: number): Duration`**
- **`Duration.ofMonths(value: number): Duration`** (30-day months)
- **`Duration.ofYears(value: number): Duration`** (365.25-day years)

Example:

```ts
import { Duration } from '@pvorona/duration';

Duration.ofHours(1).toMinutes(); // 60
Duration.ofWeeks(2).toDays(); // 14
```

#### Date helpers

- **`Duration.between(start: Date, end: Date): Duration`**
- **`Duration.since(start: Date): Duration`** (until “now”)

Example:

```ts
import { Duration } from '@pvorona/duration';

const d = Duration.between(new Date(0), new Date(1_000));
d.toSeconds(); // 1
```

#### Arithmetic helpers

- **`Duration.add(a: Duration, b: Duration): Duration`**
- **`Duration.subtract(a: Duration, b: Duration): Duration`**
- **`Duration.multiply(a: Duration, b: number): Duration`**
- **`Duration.divide(a: Duration, b: number): Duration`**

Example:

```ts
import { Duration } from '@pvorona/duration';

const d = Duration.multiply(Duration.ofSeconds(2), 3);
d.toSeconds(); // 6
```

#### Constants

- **`Duration.ofInfinite: Duration`**
- **`Duration.ofInstant: Duration`**

Example:

```ts
import { Duration } from '@pvorona/duration';

Duration.ofInstant.isInstant; // true
Duration.ofInfinite.isInfinite; // true
```

#### Guards / equality

- **`Duration.isDuration(value: unknown): value is Duration`**
- **`Duration.isEqual(a: Duration, b: Duration): boolean`**

Example:

```ts
import { Duration } from '@pvorona/duration';

const maybe: unknown = Duration.ofSeconds(1);
if (Duration.isDuration(maybe)) {
  maybe.toMilliSeconds(); // ok, narrowed
}
```
