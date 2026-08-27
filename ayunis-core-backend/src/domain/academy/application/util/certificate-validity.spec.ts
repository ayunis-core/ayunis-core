import {
  ACADEMY_COMPLETION_VALIDITY_MONTHS,
  certificateExpiresAt,
  isConfirmationWithinValidity,
} from './certificate-validity';

describe('certificateExpiresAt', () => {
  it.each([
    ['2026-07-31T09:15:00.000Z', '2027-07-31T09:15:00.000Z'],
    ['2026-01-31T00:00:00.000Z', '2027-01-31T00:00:00.000Z'],
    ['2026-12-01T23:59:59.000Z', '2027-12-01T23:59:59.000Z'],
  ])('shifts %s forward a year to %s', (completedAt, expected) => {
    expect(certificateExpiresAt(new Date(completedAt)).toISOString()).toBe(
      expected,
    );
  });

  it('clamps a leap day to the last day of the target month', () => {
    expect(
      certificateExpiresAt(new Date('2028-02-29T10:00:00.000Z')).toISOString(),
    ).toBe('2029-02-28T10:00:00.000Z');
  });

  it('does not mutate the date it is given', () => {
    const completedAt = new Date('2026-07-31T09:15:00.000Z');
    certificateExpiresAt(completedAt);
    expect(completedAt.toISOString()).toBe('2026-07-31T09:15:00.000Z');
  });

  it('is a 12-month window', () => {
    expect(ACADEMY_COMPLETION_VALIDITY_MONTHS).toBe(12);
  });
});

describe('isConfirmationWithinValidity', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');

  it('counts a confirmation from today', () => {
    expect(isConfirmationWithinValidity(now, now)).toBe(true);
  });

  it('counts a confirmation one day short of the window', () => {
    expect(
      isConfirmationWithinValidity(new Date('2025-08-01T12:00:00.000Z'), now),
    ).toBe(true);
  });

  it('drops a confirmation exactly one validity period old', () => {
    expect(
      isConfirmationWithinValidity(new Date('2025-07-31T12:00:00.000Z'), now),
    ).toBe(false);
  });

  it('drops a confirmation older than the window', () => {
    expect(
      isConfirmationWithinValidity(new Date('2025-06-30T12:00:00.000Z'), now),
    ).toBe(false);
  });
});
