import { isObject } from '@pvorona/assert';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

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

const milliSeconds = Symbol('milliSeconds');

export type Duration = {
  readonly [milliSeconds]: number;
  readonly isFinite: boolean;
  readonly isInfinite: boolean;
  readonly isInstant: boolean;

  to(unit: TimeUnit): number;
  toMilliSeconds(): number;
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
  [TimeUnit.MilliSecond]: 1,
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

const BASE_DURATION: Duration = {
  [milliSeconds]: 0,
  isFinite: false,
  isInfinite: false,
  isInstant: false,

  to(unit: TimeUnit): number {
    return this[milliSeconds] / MILLISECONDS_IN_UNIT[unit];
  },
  toMilliSeconds() {
    return this.to(TimeUnit.MilliSecond);
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
    return this[milliSeconds] === other[milliSeconds];
  },
  lessThan(other: Duration): boolean {
    return this[milliSeconds] < other[milliSeconds];
  },
  lessThanOrEqual(other: Duration): boolean {
    return this[milliSeconds] <= other[milliSeconds];
  },
  greaterThan(other: Duration): boolean {
    return this[milliSeconds] > other[milliSeconds];
  },
  greaterThanOrEqual(other: Duration): boolean {
    return this[milliSeconds] >= other[milliSeconds];
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

function createDuration(value: number, unit: TimeUnit): Duration {
  const result: Mutable<Duration> = Object.create(BASE_DURATION);
  result[milliSeconds] = value * MILLISECONDS_IN_UNIT[unit];
  result.isFinite = value !== Infinity;
  result.isInfinite = value === Infinity;
  result.isInstant = value === 0;
  return Object.freeze(result);
}

export const Duration = Object.freeze({
  of(value: number, unit: TimeUnit): Duration {
    return createDuration(value, unit);
  },
  ofMilliSeconds(value: number): Duration {
    return Duration.of(value, TimeUnit.MilliSecond);
  },
  ofSeconds(value: number): Duration {
    return Duration.of(value, TimeUnit.Second);
  },
  ofMinutes(value: number): Duration {
    return Duration.of(value, TimeUnit.Minute);
  },
  ofHours(value: number): Duration {
    return Duration.of(value, TimeUnit.Hour);
  },
  ofDays(value: number): Duration {
    return Duration.of(value, TimeUnit.Day);
  },
  ofWeeks(value: number): Duration {
    return Duration.of(value, TimeUnit.Week);
  },
  ofMonths(value: number): Duration {
    return Duration.of(value, TimeUnit.Month);
  },
  ofYears(value: number): Duration {
    return Duration.of(value, TimeUnit.Year);
  },
  between: (start: Date, end: Date): Duration => {
    return Duration.of(end.getTime() - start.getTime(), TimeUnit.MilliSecond);
  },
  since: (start: Date): Duration => {
    return Duration.between(start, new Date());
  },
  add: (a: Duration, b: Duration): Duration => {
    return Duration.ofMilliSeconds(a[milliSeconds] + b[milliSeconds]);
  },
  subtract: (a: Duration, b: Duration): Duration => {
    return Duration.ofMilliSeconds(a[milliSeconds] - b[milliSeconds]);
  },
  multiply: (a: Duration, b: number): Duration => {
    return Duration.ofMilliSeconds(a[milliSeconds] * b);
  },
  divide: (a: Duration, b: number): Duration => {
    return Duration.ofMilliSeconds(a[milliSeconds] / b);
  },
  ofInfinite: ((): Duration => {
    return createDuration(Infinity, TimeUnit.MilliSecond);
  })(),
  ofInstant: ((): Duration => {
    return createDuration(0, TimeUnit.MilliSecond);
  })(),
  isDuration: (value: unknown): value is Duration => {
    return isObject(value) && milliSeconds in value;
  },
  isEqual: (a: Duration, b: Duration): boolean => {
    return a[milliSeconds] === b[milliSeconds];
  },
});
