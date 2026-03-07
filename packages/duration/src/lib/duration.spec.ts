import { expectTypeOf } from 'expect-type';
import {
  add,
  addTo,
  between,
  days,
  divide,
  duration,
  hours,
  infinite,
  instant,
  isDuration,
  isEqual,
  milliseconds,
  minutes,
  months,
  multiply,
  seconds,
  since,
  subtract,
  subtractFrom,
  TimeUnit,
  weeks,
  years,
  type Duration,
  type DurationParts,
} from './duration.js';

type DurationModule = typeof import('./duration.js');

function callDurationWithParts(parts: DurationParts): Duration {
  return duration(parts);
}

function callDurationWithUnknownParts(parts: Record<string, number>): Duration {
  return (duration as unknown as (parts: Record<string, number>) => Duration)(parts);
}

describe('duration factories', () => {
  it('duration(value, unit) supports conversions', () => {
    const d = duration(2, TimeUnit.Minute);
    expect(d.toSeconds()).toBe(120);
    expect(d.toMilliseconds()).toBe(120_000);
  });

  it('seconds() creates a finite duration', () => {
    const d = seconds(5);
    expect(d.isFinite).toBe(true);
    expect(d.isInfinite).toBe(false);
    expect(d.isInstant).toBe(false);
    expect(d.toMilliseconds()).toBe(5_000);
  });

  it('milliseconds(0) is instant', () => {
    const d = milliseconds(0);

    expect(d.isInstant).toBe(true);
    expect(d.toSeconds()).toBe(0);
    expect(d.toMilliseconds()).toBe(0);
  });

  it('duration(parts) supports exact multi-unit construction', () => {
    const d = callDurationWithParts({ minutes: 1, seconds: 30 });

    expect(d.toSeconds()).toBe(90);
  });

  it('duration(parts) supports negative same-sign units', () => {
    const d = callDurationWithParts({ hours: -1, minutes: -30 });

    expect(d.toMilliseconds()).toBe(-5_400_000);
  });

  it('duration(parts) supports fractional units', () => {
    const d = callDurationWithParts({ hours: 1.5 });

    expect(d.toMilliseconds()).toBe(5_400_000);
  });
});

describe('constants', () => {
  it('instant is zero', () => {
    expect(instant.isInstant).toBe(true);
    expect(instant.toMilliseconds()).toBe(0);
  });

  it('infinite is infinite', () => {
    expect(infinite.isInfinite).toBe(true);
    expect(infinite.isFinite).toBe(false);
    expect(infinite.toMilliseconds()).toBe(Infinity);
  });
});

describe('date helpers', () => {
  it('between returns the millisecond difference', () => {
    const d = between(new Date(0), new Date(1_500));
    expect(d.toMilliseconds()).toBe(1_500);
  });

  it('since uses "now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(10_000));

    const d = since(new Date(7_500));
    expect(d.toMilliseconds()).toBe(2_500);

    vi.useRealTimers();
  });

  it('addTo returns a fresh date at the exact timestamp', () => {
    const start = new Date(1_000);
    const result = addTo(start, seconds(2));

    expect(result).not.toBe(start);
    expect(start.getTime()).toBe(1_000);
    expect(result.getTime()).toBe(3_000);
  });

  it('subtractFrom returns a fresh date at the exact timestamp', () => {
    const start = new Date(1_000);
    const result = subtractFrom(start, seconds(2));

    expect(result).not.toBe(start);
    expect(start.getTime()).toBe(1_000);
    expect(result.getTime()).toBe(-1_000);
  });
});

describe('arithmetic', () => {
  it('add/subtract', () => {
    const a = seconds(1);
    const b = seconds(0.5);
    expect(add(a, b).toMilliseconds()).toBe(1_500);
    expect(subtract(a, b).toMilliseconds()).toBe(500);
  });

  it('multiply/divide', () => {
    const a = seconds(2);
    expect(multiply(a, 3).toSeconds()).toBe(6);
    expect(divide(a, 4).toMilliseconds()).toBe(500);
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
    expectTypeOf<typeof addTo>().toEqualTypeOf<
      (date: Date, duration: Duration) => Date
    >();
    expectTypeOf<typeof subtractFrom>().toEqualTypeOf<
      (date: Date, duration: Duration) => Date
    >();
    expectTypeOf<Duration['toMilliseconds']>().returns.toEqualTypeOf<number>();

    const parts = { minutes: 1, seconds: 30 } satisfies DurationParts;
    expect(duration(parts).toSeconds()).toBe(90);
  });

  it('requires at least one duration part in TypeScript consumers', () => {
    const assertTypeErrors = () => {
      // @ts-expect-error `DurationParts` must contain at least one supported key.
      const emptyParts: DurationParts = {};

      // @ts-expect-error `duration({})` should not type-check.
      duration({});

      return emptyParts;
    };

    expectTypeOf(assertTypeErrors).toBeFunction();
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

  it('rejects invalid duration parts inputs', () => {
    expect(() => callDurationWithUnknownParts({})).toThrow(TypeError);
    expect(() => callDurationWithUnknownParts({ minute: 1 })).toThrow(TypeError);
    expect(() => callDurationWithUnknownParts({ ms: 5 })).toThrow(TypeError);
    expect(() => callDurationWithUnknownParts({ hours: 1, minutes: -30 })).toThrow(
      TypeError,
    );
    expect(() => callDurationWithUnknownParts({ hours: Number.NaN })).toThrow(
      TypeError,
    );
    expect(() => callDurationWithUnknownParts({ hours: Infinity })).toThrow(TypeError);
  });

  it.each([
    ['addTo', addTo],
    ['subtractFrom', subtractFrom],
  ] as const)(
    '%s rejects invalid dates',
    (_, helper) => {
      expect(() => helper(new Date('invalid'), seconds(1))).toThrow(TypeError);
    },
  );

  it.each([
    ['addTo', addTo],
    ['subtractFrom', subtractFrom],
  ] as const)(
    '%s rejects infinite durations',
    (_, helper) => {
      expect(() => helper(new Date(0), infinite)).toThrow(TypeError);
    },
  );

  it('addTo rejects out-of-range result timestamps', () => {
    expect(() => addTo(new Date(8_640_000_000_000_000), milliseconds(1))).toThrow(
      TypeError,
    );
  });

  it('subtractFrom rejects out-of-range result timestamps', () => {
    expect(() =>
      subtractFrom(new Date(-8_640_000_000_000_000), milliseconds(1)),
    ).toThrow(TypeError);
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

describe('README examples', () => {
  it('creates and converts durations', () => {
    const d = duration(2, TimeUnit.Minute);

    expect(d.toSeconds()).toBe(120);
    expect(d.toMilliseconds()).toBe(120_000);
    expect(duration(250, TimeUnit.Millisecond).toSeconds()).toBe(0.25);
  });

  it('compares durations', () => {
    const a = seconds(1);
    const b = milliseconds(900);

    expect(a.greaterThan(b)).toBe(true);
    expect(a.compare(b)).toBe(1);
  });

  it('adds durations', () => {
    const total = add(seconds(1), milliseconds(500));

    expect(total.toMilliseconds()).toBe(1_500);
  });

  it('measures time since a start date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(10_000));

    const startedAt = new Date(Date.now() - 2_000);
    const elapsed = since(startedAt);

    expect(elapsed.toSeconds()).toBe(2);

    vi.useRealTimers();
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

