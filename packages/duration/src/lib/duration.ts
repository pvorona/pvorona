import { isObject } from '@pvorona/assert';

const TIME_UNIT_VALUES = {
  Millisecond: 0,
  Second: 1,
  Minute: 2,
  Hour: 3,
  Day: 4,
  Week: 5,
  Month: 6,
  Year: 7,
} as const;

/** Supported runtime unit values used by `TimeUnit`. */
export type TimeUnit = (typeof TIME_UNIT_VALUES)[keyof typeof TIME_UNIT_VALUES];

/**
 * Runtime time-unit constants accepted by `duration(value, unit)` and `d.to(unit)`.
 *
 * `Month` uses a 30-day approximation and `Year` uses a 365.25-day approximation.
 */
export const TimeUnit: {
  readonly [Key in keyof typeof TIME_UNIT_VALUES]: TimeUnit;
} = TIME_UNIT_VALUES;

const DURATION_PART_TIME_UNITS = {
  milliseconds: TimeUnit.Millisecond,
  seconds: TimeUnit.Second,
  minutes: TimeUnit.Minute,
  hours: TimeUnit.Hour,
  days: TimeUnit.Day,
  weeks: TimeUnit.Week,
  months: TimeUnit.Month,
  years: TimeUnit.Year,
} as const;

type DurationPartKey = keyof typeof DURATION_PART_TIME_UNITS;

type RequireAtLeastOne<T> = {
  [Key in keyof T]-?: Required<Pick<T, Key>> & Partial<Omit<T, Key>>;
}[keyof T];

type MutableDuration = {
  -readonly [Key in keyof Duration]: Duration[Key];
};

/** Input bag accepted by `duration(parts)` for strict multi-unit construction. */
export type DurationParts = RequireAtLeastOne<{
  readonly [Key in DurationPartKey]?: number;
}>;

const millisecondsTag = Symbol('milliseconds');
const TIME_UNITS = new Set<TimeUnit>(Object.values(TimeUnit));
const DURATION_PART_KEYS = new Set<DurationPartKey>(
  Object.keys(DURATION_PART_TIME_UNITS) as DurationPartKey[],
);

/** Immutable duration value with conversions, comparisons, and state flags. */
export type Duration = {
  readonly [millisecondsTag]: number;
  readonly isFinite: boolean;
  readonly isInfinite: boolean;
  readonly isInstant: boolean;

  to(unit: TimeUnit): number;
  toMilliseconds(): number;
  toSeconds(): number;
  toMinutes(): number;
  toHours(): number;
  toDays(): number;
  toWeeks(): number;
  toMonths(): number;
  toYears(): number;

  equals(other: Duration): boolean;
  lessThan(other: Duration): boolean;
  lessThanOrEqual(other: Duration): boolean;
  greaterThan(other: Duration): boolean;
  greaterThanOrEqual(other: Duration): boolean;
  compare(other: Duration): -1 | 0 | 1;
};

const MILLISECONDS_IN_UNIT = {
  [TimeUnit.Millisecond]: 1,
  [TimeUnit.Second]: 1_000,
  [TimeUnit.Minute]: 60 * 1_000,
  [TimeUnit.Hour]: 60 * 60 * 1_000,
  /** Note: Does not account for leap second */
  [TimeUnit.Day]: 24 * 60 * 60 * 1_000,
  [TimeUnit.Week]: 7 * 24 * 60 * 60 * 1_000,
  /** Note: Does not account for leap year */
  [TimeUnit.Month]: /* 30 days */ 30 * 24 * 60 * 60 * 1_000,
  /** Note: Does not account for leap year */
  [TimeUnit.Year]: /* 365.25 days */ 365.25 * 24 * 60 * 60 * 1_000,
} as const;

function ensureTimeUnit(unit: TimeUnit): TimeUnit {
  if (TIME_UNITS.has(unit)) {
    return unit;
  }

  throw new TypeError('Expected a valid time unit.');
}

function ensureFiniteNumber(value: number, name: string): number {
  if (Number.isFinite(value)) {
    return value;
  }

  throw new TypeError(`Expected \`${name}\` to be finite.`);
}

function ensureValidDate(date: Date, name: string): number {
  const timestamp = date.getTime();
  if (!Number.isNaN(timestamp)) {
    return timestamp;
  }

  throw new TypeError(`Expected \`${name}\` to be a valid date.`);
}

function createValidDate(timestamp: number, name: string): Date {
  const result = new Date(timestamp);
  ensureValidDate(result, name);
  return result;
}

function ensureDurationPartsKey(key: string): DurationPartKey {
  if (DURATION_PART_KEYS.has(key as DurationPartKey)) {
    return key as DurationPartKey;
  }

  throw new TypeError(`Expected \`${key}\` to be a supported duration part.`);
}

function durationPartsToMilliseconds(parts: DurationParts): number {
  const entries = Object.entries(parts);

  if (entries.length === 0) {
    throw new TypeError(
      'Expected `parts` to include at least one duration part.',
    );
  }

  let milliseconds = 0;
  let nonZeroSign: -1 | 1 | undefined;

  for (const [rawKey, rawValue] of entries) {
    const key = ensureDurationPartsKey(rawKey);
    const value = ensureFiniteNumber(rawValue, `parts.${key}`);
    if (value === 0) {
      continue;
    }

    const sign = Math.sign(value) as -1 | 1;
    if (nonZeroSign == null) {
      nonZeroSign = sign;
    }
    if (nonZeroSign !== sign) {
      throw new TypeError(
        'Expected non-zero duration parts to share the same sign.',
      );
    }

    milliseconds += value * MILLISECONDS_IN_UNIT[DURATION_PART_TIME_UNITS[key]];
  }

  return milliseconds;
}

function normalizeMilliseconds(
  milliseconds: number,
  options?: { readonly allowInfinite?: boolean },
): number {
  if (Number.isNaN(milliseconds) || milliseconds === Number.NEGATIVE_INFINITY) {
    throw new TypeError(
      'Expected duration milliseconds to be finite or `Infinity`.',
    );
  }

  if (milliseconds !== Infinity || options?.allowInfinite) {
    return milliseconds;
  }

  throw new TypeError('Expected duration milliseconds to be finite.');
}

const BASE_DURATION: Duration = {
  [millisecondsTag]: 0,
  isFinite: false,
  isInfinite: false,
  isInstant: false,

  to(unit: TimeUnit): number {
    return this[millisecondsTag] / MILLISECONDS_IN_UNIT[ensureTimeUnit(unit)];
  },
  toMilliseconds() {
    return this.to(TimeUnit.Millisecond);
  },
  toSeconds() {
    return this.to(TimeUnit.Second);
  },
  toMinutes() {
    return this.to(TimeUnit.Minute);
  },
  toHours() {
    return this.to(TimeUnit.Hour);
  },
  toDays() {
    return this.to(TimeUnit.Day);
  },
  toWeeks() {
    return this.to(TimeUnit.Week);
  },
  toMonths() {
    return this.to(TimeUnit.Month);
  },
  toYears() {
    return this.to(TimeUnit.Year);
  },
  equals(other: Duration): boolean {
    return this[millisecondsTag] === other[millisecondsTag];
  },
  lessThan(other: Duration): boolean {
    return this[millisecondsTag] < other[millisecondsTag];
  },
  lessThanOrEqual(other: Duration): boolean {
    return this[millisecondsTag] <= other[millisecondsTag];
  },
  greaterThan(other: Duration): boolean {
    return this[millisecondsTag] > other[millisecondsTag];
  },
  greaterThanOrEqual(other: Duration): boolean {
    return this[millisecondsTag] >= other[millisecondsTag];
  },
  compare(other: Duration): -1 | 0 | 1 {
    if (this.lessThan(other)) {
      return -1;
    }
    if (this.greaterThan(other)) {
      return 1;
    }
    return 0;
  },
} as const;

function createDuration(
  milliseconds: number,
  options?: { readonly allowInfinite?: boolean },
): Duration {
  const normalizedMilliseconds = normalizeMilliseconds(milliseconds, options);
  const result: MutableDuration = Object.create(BASE_DURATION);
  result[millisecondsTag] = normalizedMilliseconds;
  result.isFinite = Number.isFinite(normalizedMilliseconds);
  result.isInfinite = normalizedMilliseconds === Infinity;
  result.isInstant = normalizedMilliseconds === 0;
  return Object.freeze(result);
}

/** Creates a duration from a finite numeric value in the provided unit. */
export function duration(value: number, unit: TimeUnit): Duration;

/** Creates a duration from strict multi-unit parts. */
export function duration(parts: DurationParts): Duration;

export function duration(
  valueOrParts: number | DurationParts,
  unit?: TimeUnit,
): Duration {
  if (isObject(valueOrParts)) {
    return createDuration(durationPartsToMilliseconds(valueOrParts));
  }

  const normalizedValue = ensureFiniteNumber(valueOrParts, 'value');
  const normalizedUnit = ensureTimeUnit(unit as TimeUnit);

  return createDuration(normalizedValue * MILLISECONDS_IN_UNIT[normalizedUnit]);
}

/** Creates a duration from a finite millisecond value. */
export function milliseconds(value: number): Duration {
  return duration(value, TimeUnit.Millisecond);
}

/** Creates a duration from a finite second value. */
export function seconds(value: number): Duration {
  return duration(value, TimeUnit.Second);
}

/** Creates a duration from a finite minute value. */
export function minutes(value: number): Duration {
  return duration(value, TimeUnit.Minute);
}

/** Creates a duration from a finite hour value. */
export function hours(value: number): Duration {
  return duration(value, TimeUnit.Hour);
}

/** Creates a duration from a finite day value. */
export function days(value: number): Duration {
  return duration(value, TimeUnit.Day);
}

/** Creates a duration from a finite week value. */
export function weeks(value: number): Duration {
  return duration(value, TimeUnit.Week);
}

/** Creates a duration from a finite approximate month value (30 days each). */
export function months(value: number): Duration {
  return duration(value, TimeUnit.Month);
}

/** Creates a duration from a finite approximate year value (365.25 days each). */
export function years(value: number): Duration {
  return duration(value, TimeUnit.Year);
}

/** Returns the duration between two valid dates. The result may be negative. */
export function between(start: Date, end: Date): Duration {
  const startTime = ensureValidDate(start, 'start');
  const endTime = ensureValidDate(end, 'end');

  return createDuration(endTime - startTime);
}

/** Returns the duration since a valid start date. The result may be negative. */
export function since(start: Date): Duration {
  return between(start, new Date());
}

function ensureFiniteDurationForDateMath(duration: Duration): number {
  if (!duration.isInfinite) {
    return duration.toMilliseconds();
  }

  throw new TypeError('Expected `duration` to be finite.');
}

/** Adds two durations and preserves the explicit `infinite` sentinel. */
export function add(a: Duration, b: Duration): Duration {
  if (a.isInfinite || b.isInfinite) {
    return infinite;
  }

  return createDuration(a[millisecondsTag] + b[millisecondsTag]);
}

/** Subtracts one duration from another and rejects undefined `infinite` cases. */
export function subtract(a: Duration, b: Duration): Duration {
  if (a.isInfinite && b.isInfinite) {
    throw new TypeError('Cannot subtract `infinite` from `infinite`.');
  }

  if (a.isInfinite) {
    return infinite;
  }

  if (b.isInfinite) {
    throw new TypeError('Cannot subtract `infinite` from a finite duration.');
  }

  return createDuration(a[millisecondsTag] - b[millisecondsTag]);
}

/** Multiplies a duration by a finite scalar. */
export function multiply(a: Duration, b: number): Duration {
  const scalar = ensureFiniteNumber(b, 'multiplier');

  if (!a.isInfinite) {
    return createDuration(a[millisecondsTag] * scalar);
  }

  if (scalar > 0) {
    return infinite;
  }

  throw new TypeError(
    'Cannot multiply `infinite` by zero or a negative number.',
  );
}

/** Divides a duration by a finite, non-zero scalar. */
export function divide(a: Duration, b: number): Duration {
  const scalar = ensureFiniteNumber(b, 'divisor');
  if (scalar === 0) {
    throw new TypeError('Cannot divide by zero.');
  }

  if (!a.isInfinite) {
    return createDuration(a[millisecondsTag] / scalar);
  }

  if (scalar > 0) {
    return infinite;
  }

  throw new TypeError('Cannot divide `infinite` by a negative number.');
}

/** Returns a new date shifted forward by an exact duration timestamp delta. */
export function addTo(date: Date, duration: Duration): Date {
  const timestamp = ensureValidDate(date, 'date');
  const milliseconds = ensureFiniteDurationForDateMath(duration);

  return createValidDate(timestamp + milliseconds, 'result');
}

/** Returns a new date shifted backward by an exact duration timestamp delta. */
export function subtractFrom(date: Date, duration: Duration): Date {
  const timestamp = ensureValidDate(date, 'date');
  const milliseconds = ensureFiniteDurationForDateMath(duration);

  return createValidDate(timestamp - milliseconds, 'result');
}

/** The explicit non-finite duration sentinel supported by this package. */
export const infinite: Duration = createDuration(Infinity, {
  allowInfinite: true,
});

/** The zero-length duration constant. */
export const instant: Duration = milliseconds(0);

/** Returns `true` when the value is a duration created by this package. */
export function isDuration(value: unknown): value is Duration {
  return Object.prototype.hasOwnProperty.call(value, millisecondsTag);
}

/** Compares two durations by their normalized millisecond payload. */
export function isEqual(a: Duration, b: Duration): boolean {
  return a[millisecondsTag] === b[millisecondsTag];
}
