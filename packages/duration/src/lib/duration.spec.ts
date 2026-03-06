import { expectTypeOf } from 'expect-type';
import type { Duration } from './duration.js';
import {
  add,
  between,
  days,
  divide,
  duration,
  hours,
  infinite,
  instant,
  isDuration,
  isEqual,
  minutes,
  months,
  multiply,
  seconds,
  since,
  subtract,
  TimeUnit,
  weeks,
  years,
} from './duration.js';

type DurationModule = typeof import('./duration.js');

async function loadMillisecondsFactory(): Promise<(value: number) => Duration> {
  const durationModule = await import('./duration.js');

  expect(durationModule).toHaveProperty('milliseconds');

  const milliseconds = Reflect.get(durationModule, 'milliseconds');
  if (typeof milliseconds !== 'function') {
    throw new TypeError('Expected `milliseconds` to be a function');
  }

  return milliseconds as (value: number) => Duration;
}

function toMilliseconds(value: Duration): number {
  const toMilliseconds = Reflect.get(value, 'toMilliseconds');
  if (typeof toMilliseconds !== 'function') {
    throw new TypeError('Expected `toMilliseconds` to be a function');
  }

  return Reflect.apply(toMilliseconds, value, []) as number;
}

describe('duration factories', () => {
  it('duration(value, unit) supports conversions', () => {
    const d = duration(2, TimeUnit.Minute);
    expect(d.toSeconds()).toBe(120);
    expect(toMilliseconds(d)).toBe(120_000);
  });

  it('seconds() creates a finite duration', () => {
    const d = seconds(5);
    expect(d.isFinite).toBe(true);
    expect(d.isInfinite).toBe(false);
    expect(d.isInstant).toBe(false);
    expect(toMilliseconds(d)).toBe(5_000);
  });

  it('milliseconds(0) is instant', async () => {
    const milliseconds = await loadMillisecondsFactory();
    const d = milliseconds(0);

    expect(d.isInstant).toBe(true);
    expect(d.toSeconds()).toBe(0);
    expect(toMilliseconds(d)).toBe(0);
  });
});

describe('constants', () => {
  it('instant is zero', () => {
    expect(instant.isInstant).toBe(true);
    expect(toMilliseconds(instant)).toBe(0);
  });

  it('infinite is infinite', () => {
    expect(infinite.isInfinite).toBe(true);
    expect(infinite.isFinite).toBe(false);
    expect(toMilliseconds(infinite)).toBe(Infinity);
  });
});

describe('date helpers', () => {
  it('between returns the millisecond difference', () => {
    const d = between(new Date(0), new Date(1_500));
    expect(toMilliseconds(d)).toBe(1_500);
  });

  it('since uses "now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(10_000));

    const d = since(new Date(7_500));
    expect(toMilliseconds(d)).toBe(2_500);

    vi.useRealTimers();
  });
});

describe('arithmetic', () => {
  it('add/subtract', () => {
    const a = seconds(1);
    const b = seconds(0.5);
    expect(toMilliseconds(add(a, b))).toBe(1_500);
    expect(toMilliseconds(subtract(a, b))).toBe(500);
  });

  it('multiply/divide', () => {
    const a = seconds(2);
    expect(multiply(a, 3).toSeconds()).toBe(6);
    expect(toMilliseconds(divide(a, 4))).toBe(500);
  });
});

describe('guards / equality', () => {
  it('isDuration narrows', () => {
    const maybe: unknown = seconds(1);

    if (!isDuration(maybe)) {
      throw new Error('expected Duration');
    }

    maybe.toSeconds();

    expectTypeOf(maybe).toEqualTypeOf<Duration>();
  });

  it('isEqual compares durations by value', () => {
    expect(isEqual(seconds(1), divide(seconds(2), 2))).toBe(true);
    expect(isEqual(seconds(1), seconds(2))).toBe(false);
  });
});

describe('public millisecond API', () => {
  it('exposes `TimeUnit.Millisecond` at runtime', () => {
    expect(TimeUnit).toHaveProperty('Millisecond');
  });

  it('exposes the renamed API surface to TypeScript consumers', () => {
    expectTypeOf<typeof TimeUnit.Millisecond>().toEqualTypeOf<TimeUnit>();
    expectTypeOf<DurationModule['milliseconds']>().toEqualTypeOf<
      (value: number) => Duration
    >();
    expectTypeOf<Duration['toMilliseconds']>().returns.toEqualTypeOf<number>();
  });

  it('removes the legacy millisecond spellings from TypeScript consumers', () => {
    // @ts-expect-error `MilliSecond` was replaced by `Millisecond`.
    expectTypeOf<typeof TimeUnit.MilliSecond>().toEqualTypeOf<TimeUnit>();
    // @ts-expect-error `milliSeconds` was replaced by `milliseconds`.
    expectTypeOf<DurationModule['milliSeconds']>().toEqualTypeOf<
      (value: number) => Duration
    >();
    // @ts-expect-error `toMilliSeconds` was replaced by `toMilliseconds`.
    expectTypeOf<Duration['toMilliSeconds']>().returns.toEqualTypeOf<number>();
  });
});

describe('runtime contract', () => {
  it('rejects invalid constructor inputs', () => {
    expect(() => duration(Number.NaN, TimeUnit.Second)).toThrow();
    expect(() => duration(Number.NEGATIVE_INFINITY, TimeUnit.Second)).toThrow();
    expect(() => duration(1, 999 as TimeUnit)).toThrow();
  });

  it('rejects invalid dates', () => {
    expect(() => between(new Date('invalid'), new Date())).toThrow();
    expect(() => since(new Date('invalid'))).toThrow();
  });

  it('rejects undefined arithmetic', () => {
    expect(() => subtract(infinite, infinite)).toThrow();
    expect(() => multiply(infinite, 0)).toThrow();
    expect(() => divide(instant, 0)).toThrow();
  });

  it('supports negative finite durations', () => {
    const result = subtract(seconds(1), seconds(2));

    expect(result.isFinite).toBe(true);
    expect(result.isInfinite).toBe(false);
    expect(result.isInstant).toBe(false);
    expect(result.toSeconds()).toBe(-1);
    expect(result.lessThan(instant)).toBe(true);
  });
});

describe('unit shortcuts', () => {
  it.each([
    ['minutes', minutes(1), 60],
    ['hours', hours(1), 3_600],
    ['days', days(1), 86_400],
    ['weeks', weeks(1), 7 * 86_400],
    ['months', months(1), 30 * 86_400],
    ['years', years(1), 365.25 * 86_400],
  ] as const)('%s()', (_, d, secondsExpected) => {
    expect(d.toSeconds()).toBe(secondsExpected);
  });
});

