import {
  add,
  duration,
  milliseconds,
  seconds,
  since,
  TimeUnit,
} from '@pvorona/duration';

afterEach(() => {
  vi.useRealTimers();
});

describe('public surface', () => {
  it('supports the README create-and-convert example', () => {
    const value = duration(2, TimeUnit.Minute);

    expect(value.toSeconds()).toBe(120);
    expect(value.toMilliseconds()).toBe(120_000);
    expect(duration(250, TimeUnit.Millisecond).toSeconds()).toBe(0.25);
  });

  it('supports the README comparison example', () => {
    const a = seconds(1);
    const b = milliseconds(900);

    expect(a.greaterThan(b)).toBe(true);
    expect(a.compare(b)).toBe(1);
  });

  it('supports the README arithmetic example', () => {
    const total = add(seconds(1), milliseconds(500));

    expect(total.toMilliseconds()).toBe(1_500);
  });

  it('supports the README elapsed-time example', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(10_000));

    const startedAt = new Date(Date.now() - 2_000);
    const elapsed = since(startedAt);

    expect(elapsed.toSeconds()).toBe(2);
  });
});
