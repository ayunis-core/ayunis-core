import { describe, expect, it } from 'vitest';
import { resolveCertificateExpiryNotice } from './resolve-certificate-expiry-notice';

describe('resolveCertificateExpiryNotice', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  function inDays(days: number): Date {
    return new Date(now.getTime() + days * DAY_MS);
  }

  function levelIn(days: number) {
    return resolveCertificateExpiryNotice(inDays(days), now).level;
  }

  // Modes without renewal report no expiry at all, which is what keeps the
  // notifications out of them entirely.
  it('stays silent without an expiry date', () => {
    expect(resolveCertificateExpiryNotice(null, now)).toEqual({
      level: 'none',
      daysRemaining: 0,
    });
  });

  it('stays silent more than a month out', () => {
    expect(levelIn(31)).toBe('none');
  });

  it('raises the dismissible pop-up from a month out', () => {
    expect(levelIn(30)).toBe('month');
    expect(levelIn(15)).toBe('month');
  });

  it('escalates to the red pop-up from two weeks out', () => {
    expect(levelIn(14)).toBe('twoWeeks');
    expect(levelIn(8)).toBe('twoWeeks');
  });

  it('escalates to the countdown banner in the final week', () => {
    expect(levelIn(7)).toBe('countdown');
    expect(levelIn(1)).toBe('countdown');
  });

  // Past expiry the gate blocks chat and says so; counting down to a moment
  // already gone would contradict it.
  it('stops once the certificate has lapsed', () => {
    expect(levelIn(0)).toBe('none');
    expect(levelIn(-3)).toBe('none');
  });

  it('rounds part days up so the last day still reads as one day left', () => {
    const inHalfADay = new Date(now.getTime() + DAY_MS / 2);

    expect(resolveCertificateExpiryNotice(inHalfADay, now)).toEqual({
      level: 'countdown',
      daysRemaining: 1,
    });
  });
});
