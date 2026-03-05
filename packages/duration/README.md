# @pvorona/duration

An immutable duration type with unit conversions, comparisons, and basic arithmetic.

## Install

```bash
npm i @pvorona/duration
```

## Usage

### Create and convert

```ts
import { minutes } from '@pvorona/duration';

const d = minutes(5);
d.toSeconds(); // 300
d.toMilliSeconds(); // 300_000
```

### Compare

```ts
import { milliSeconds, seconds } from '@pvorona/duration';

const a = seconds(1);
const b = milliSeconds(900);

a.greaterThan(b); // true
a.compare(b); // 1
```

### Arithmetic

```ts
import { add, milliSeconds, seconds } from '@pvorona/duration';

const total = add(seconds(1), milliSeconds(500));
total.toMilliSeconds(); // 1500
```

### Between dates

```ts
import { since } from '@pvorona/duration';

const startedAt = new Date(Date.now() - 2_000);
const elapsed = since(startedAt);
elapsed.toSeconds(); // ~2
```

## API

### `const enum TimeUnit`

Time units supported by `duration(value, unit)` and `d.to(unit)`.

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
import { duration, TimeUnit } from '@pvorona/duration';

duration(2, TimeUnit.Hour).toMinutes(); // 120
```

### `type Duration`

An opaque, immutable duration value.

#### Properties

- **`isFinite: boolean`**: `true` unless the duration is infinite
- **`isInfinite: boolean`**: `true` for `infinite`
- **`isInstant: boolean`**: `true` for zero duration (`instant`)

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
import { milliSeconds, seconds, type Duration } from '@pvorona/duration';

function isShort(d: Duration) {
  return d.isFinite && d.toSeconds() < 5;
}

const a = seconds(1);
const b = milliSeconds(900);

isShort(a); // true
a.greaterThan(b); // true
```

### Function API

#### Constructors

- `duration(value: number, unit: TimeUnit): Duration`
- `milliSeconds(value: number): Duration`
- `seconds(value: number): Duration`
- `minutes(value: number): Duration`
- `hours(value: number): Duration`
- `days(value: number): Duration`
- `weeks(value: number): Duration`
- `months(value: number): Duration`
- `years(value: number): Duration`

#### Date helpers

- `between(start: Date, end: Date): Duration`
- `since(start: Date): Duration`

#### Arithmetic helpers

- `add(a: Duration, b: Duration): Duration`
- `subtract(a: Duration, b: Duration): Duration`
- `multiply(a: Duration, b: number): Duration`
- `divide(a: Duration, b: number): Duration`

#### Constants

- `instant: Duration`
- `infinite: Duration`

#### Guards / equality

- `isDuration(value: unknown): value is Duration`
- `isEqual(a: Duration, b: Duration): boolean`

Example:

```ts
import { isDuration, seconds } from '@pvorona/duration';

const maybe: unknown = seconds(1);
if (isDuration(maybe)) {
  maybe.toMilliSeconds(); // ok, narrowed
}
```
