# @pvorona/duration

An immutable ESM-only duration type with unit conversions, comparisons, and basic arithmetic.

## Install

```bash
npm i @pvorona/duration
```

This package is ESM-only. Import it from ESM modules instead of `require(...)`.

## Usage

### Create and convert

```ts
import { duration, TimeUnit } from '@pvorona/duration';

const d = duration(2, TimeUnit.Minute);
d.toSeconds(); // 120
d.toMilliseconds(); // 120_000
duration(250, TimeUnit.Millisecond).toSeconds(); // 0.25
```

### Compare

```ts
import { milliseconds, seconds } from '@pvorona/duration';

const a = seconds(1);
const b = milliseconds(900);

a.greaterThan(b); // true
a.compare(b); // 1
```

### Arithmetic

```ts
import { add, milliseconds, seconds } from '@pvorona/duration';

const total = add(seconds(1), milliseconds(500));
total.toMilliseconds(); // 1500
```

### Between dates

```ts
import { since } from '@pvorona/duration';

const startedAt = new Date(Date.now() - 2_000);
const elapsed = since(startedAt);
elapsed.toSeconds(); // ~2
```

## Important semantics

- ESM-only package: use `import`, not `require(...)`.
- Duration values are frozen branded objects created by this package. Use `isDuration(...)` for unknown inputs instead of duck typing.
- Compare durations by value with `d.equals(other)` or `isEqual(a, b)`, not `===`.
- Do not spread, JSON-serialize, or structured-clone `Duration` values as a transport format. Serialize your own explicit shape and reconstruct with `milliseconds(...)` for finite values or `infinite` for the sentinel.
- `instant` is the exported zero-duration constant, but any zero-valued duration has `isInstant === true`.
- The public millisecond APIs are `TimeUnit.Millisecond`, `milliseconds(...)`, and `toMilliseconds()`.
- `Month` is treated as 30 days and `Year` as 365.25 days. These are approximations, not calendar-aware durations.
- Negative finite durations are valid. `between(...)`, `since(...)`, arithmetic, and comparisons can produce or operate on negative values.
- Constructors accept only finite numeric inputs. `infinite` is the only supported non-finite duration.
- `add(infinite, x)`, `subtract(infinite, finite)`, `multiply(infinite, positive finite)`, and `divide(infinite, positive finite)` return `infinite`.
- Invalid units, invalid dates, non-finite scalar inputs, divide-by-zero, `subtract(infinite, infinite)`, `subtract(finite, infinite)`, `multiply(infinite, 0)`, `multiply(infinite, negative)`, and `divide(infinite, negative)` throw `TypeError`.

## API

### `TimeUnit`

The package exports both:

- `type TimeUnit`: the union of the supported runtime unit values
- `const TimeUnit`: the runtime constants accepted by `duration(value, unit)` and `d.to(unit)`

- `TimeUnit.Millisecond`
- `TimeUnit.Second`
- `TimeUnit.Minute`
- `TimeUnit.Hour`
- `TimeUnit.Day`
- `TimeUnit.Week`
- `TimeUnit.Month`
- `TimeUnit.Year`

### `type Duration`

An opaque, immutable duration value. Duration instances are branded by the package, so use `isDuration(...)` for unknown inputs and compare values with `equals(...)` / `isEqual(...)` rather than `===`.

#### Properties

- **`isFinite: boolean`**: `true` for finite durations
- **`isInfinite: boolean`**: `true` only for `infinite`
- **`isInstant: boolean`**: `true` for any zero duration (including `instant`)

#### Conversions

- **`to(unit: TimeUnit): number`**: convert to an arbitrary unit
- **`toMilliseconds(): number`**
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

Example:

```ts
import { milliseconds, seconds, type Duration } from '@pvorona/duration';

function isShort(d: Duration) {
  return d.isFinite && d.toSeconds() < 5;
}

const a = seconds(1);
const b = milliseconds(900);

isShort(a); // true
a.greaterThan(b); // true
```

### Function API

#### Constructors

- `duration(value: number, unit: TimeUnit): Duration`
- `milliseconds(value: number): Duration`
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
  maybe.toMilliseconds(); // ok, narrowed
}
```
