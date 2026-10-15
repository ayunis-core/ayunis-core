import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDateCopy } from './request-date';

describe('requestDateCopy', () => {
  const now = new Date(2026, 9, 15, 14, 0, 0);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says "just now" within the first minute', () => {
    const requestedAt = new Date(2026, 9, 15, 13, 59, 30).toISOString();
    expect(requestDateCopy(requestedAt, 'de', now)).toEqual({
      key: 'date.justNow',
    });
  });

  it('shows the time for requests from today', () => {
    const requestedAt = new Date(2026, 9, 15, 9, 14).toISOString();
    expect(requestDateCopy(requestedAt, 'de', now)).toEqual({
      key: 'date.today',
      values: { time: '09:14' },
    });
  });

  it('shows the time for requests from yesterday', () => {
    const requestedAt = new Date(2026, 9, 14, 16, 30).toISOString();
    expect(requestDateCopy(requestedAt, 'de', now)).toEqual({
      key: 'date.yesterday',
      values: { time: '16:30' },
    });
  });

  it('shows the date for older requests in the reader’s format', () => {
    const requestedAt = new Date(2026, 9, 7, 8, 0).toISOString();
    expect(requestDateCopy(requestedAt, 'de', now)).toEqual({
      key: 'date.plain',
      values: { date: '07.10.2026' },
    });
    expect(requestDateCopy(requestedAt, 'en', now)).toEqual({
      key: 'date.plain',
      values: { date: '10/07/2026' },
    });
  });
});
