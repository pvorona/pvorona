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

const millisecondsTag = Symbol('milliSeconds');

export type Duration = {
  readonly [millisecondsTag]: number;
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
  [millisecondsTag]: 0,
  isFinite: false,
  isInfinite: false,
  isInstant: false,

  to(unit: TimeUnit): number {
    return this[millisecondsTag] / MILLISECONDS_IN_UNIT[unit];
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

function createDuration(value: number, unit: TimeUnit): Duration {
  const result: Mutable<Duration> = Object.create(BASE_DURATION);
  result[millisecondsTag] = value * MILLISECONDS_IN_UNIT[unit];
  result.isFinite = value !== Infinity;
  result.isInfinite = value === Infinity;
  result.isInstant = value === 0;
  return Object.freeze(result);
}

export function duration(value: number, unit: TimeUnit): Duration {
  return createDuration(value, unit);
}

export function milliSeconds(value: number): Duration {
  return duration(value, TimeUnit.MilliSecond);
}

export function seconds(value: number): Duration {
  return duration(value, TimeUnit.Second);
}

export function minutes(value: number): Duration {
  return duration(value, TimeUnit.Minute);
}

export function hours(value: number): Duration {
  return duration(value, TimeUnit.Hour);
}

export function days(value: number): Duration {
  return duration(value, TimeUnit.Day);
}

export function weeks(value: number): Duration {
  return duration(value, TimeUnit.Week);
}

export function months(value: number): Duration {
  return duration(value, TimeUnit.Month);
}

export function years(value: number): Duration {
  return duration(value, TimeUnit.Year);
}

export function between(start: Date, end: Date): Duration {
  return milliSeconds(end.getTime() - start.getTime());
}

export function since(start: Date): Duration {
  return between(start, new Date());
}

export function add(a: Duration, b: Duration): Duration {
  return milliSeconds(a[millisecondsTag] + b[millisecondsTag]);
}

export function subtract(a: Duration, b: Duration): Duration {
  return milliSeconds(a[millisecondsTag] - b[millisecondsTag]);
}

export function multiply(a: Duration, b: number): Duration {
  return milliSeconds(a[millisecondsTag] * b);
}

export function divide(a: Duration, b: number): Duration {
  return milliSeconds(a[millisecondsTag] / b);
}

export const infinite: Duration = milliSeconds(Infinity);
export const instant: Duration = milliSeconds(0);

export function isDuration(value: unknown): value is Duration {
  return isObject(value) && millisecondsTag in value;
}

export function isEqual(a: Duration, b: Duration): boolean {
  return a[millisecondsTag] === b[millisecondsTag];
}
