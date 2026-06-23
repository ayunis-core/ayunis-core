import { describe, expect, it } from 'vitest';
import { formatRetentionPeriod, isMoreAggressive } from './format-period';

describe('formatRetentionPeriod', () => {
  const t = ((key: string, opts?: { count?: number }) =>
    `${key}:${opts?.count}`) as unknown as Parameters<
    typeof formatRetentionPeriod
  >[1];

  it('renders whole years as years', () => {
    expect(formatRetentionPeriod(365, t)).toBe('retention.year:1');
    expect(formatRetentionPeriod(730, t)).toBe('retention.year:2');
  });

  it('renders sub-year windows as days', () => {
    expect(formatRetentionPeriod(30, t)).toBe('retention.days:30');
    expect(formatRetentionPeriod(180, t)).toBe('retention.days:180');
  });
});

describe('isMoreAggressive', () => {
  it('flags enabling retention from disabled', () => {
    expect(isMoreAggressive(null, 90)).toBe(true);
  });

  it('flags shortening the window', () => {
    expect(isMoreAggressive(365, 30)).toBe(true);
  });

  it('does not flag disabling retention', () => {
    expect(isMoreAggressive(90, null)).toBe(false);
  });

  it('does not flag lengthening the window', () => {
    expect(isMoreAggressive(30, 365)).toBe(false);
  });
});
