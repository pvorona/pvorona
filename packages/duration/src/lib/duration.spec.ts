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
  milliSeconds,
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

describe('duration factories', () => {
  it('duration(value, unit) supports conversions', () => {
    const d = duration(2, TimeUnit.Minute);
    expect(d.toSeconds()).toBe(120);
    expect(d.toMilliSeconds()).toBe(120_000);
  });

  it('seconds() creates a finite duration', () => {
    const d = seconds(5);
    expect(d.isFinite).toBe(true);
    expect(d.isInfinite).toBe(false);
    expect(d.isInstant).toBe(false);
    expect(d.toMilliSeconds()).toBe(5_000);
  });

  it('milliSeconds(0) is instant', () => {
    const d = milliSeconds(0);
    expect(d.isInstant).toBe(true);
    expect(d.toSeconds()).toBe(0);
  });
});

describe('constants', () => {
  it('instant is zero', () => {
    expect(instant.isInstant).toBe(true);
    expect(instant.toMilliSeconds()).toBe(0);
  });

  it('infinite is infinite', () => {
    expect(infinite.isInfinite).toBe(true);
    expect(infinite.isFinite).toBe(false);
    expect(infinite.toMilliSeconds()).toBe(Infinity);
  });
});

describe('date helpers', () => {
  it('between returns the millisecond difference', () => {
    const d = between(new Date(0), new Date(1_500));
    expect(d.toMilliSeconds()).toBe(1_500);
  });

  it('since uses "now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(10_000));

    const d = since(new Date(7_500));
    expect(d.toMilliSeconds()).toBe(2_500);

    vi.useRealTimers();
  });
});

describe('arithmetic', () => {
  it('add/subtract', () => {
    const a = seconds(1);
    const b = milliSeconds(500);
    expect(add(a, b).toMilliSeconds()).toBe(1_500);
    expect(subtract(a, b).toMilliSeconds()).toBe(500);
  });

  it('multiply/divide', () => {
    const a = seconds(2);
    expect(multiply(a, 3).toSeconds()).toBe(6);
    expect(divide(a, 4).toMilliSeconds()).toBe(500);
  });
});

describe('guards / equality', () => {
  it('isDuration narrows', () => {
    const maybe: unknown = seconds(1);

    if (!isDuration(maybe)) {
      throw new Error('expected Duration');
    }

    maybe.toMilliSeconds();

    expectTypeOf(maybe).toEqualTypeOf<Duration>();
  });

  it('isEqual compares durations by value', () => {
    expect(isEqual(seconds(1), milliSeconds(1000))).toBe(true);
    expect(isEqual(seconds(1), seconds(2))).toBe(false);
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

