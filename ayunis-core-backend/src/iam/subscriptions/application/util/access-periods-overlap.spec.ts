import { accessPeriodsOverlap } from './access-periods-overlap';

const open = (startsAt: string, accessEndsAt: string | null = null) => ({
  startsAt: new Date(startsAt),
  accessEndsAt: accessEndsAt ? new Date(accessEndsAt) : null,
});

describe('accessPeriodsOverlap', () => {
  it('treats touching exclusive boundaries as non-overlapping', () => {
    expect(
      accessPeriodsOverlap(
        open('2026-01-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'),
        open('2026-08-01T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('treats empty periods as non-overlapping', () => {
    const empty = open('2026-12-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z');
    const serving = open('2026-01-01T00:00:00.000Z');

    expect(accessPeriodsOverlap(empty, serving)).toBe(false);
    expect(accessPeriodsOverlap(serving, empty)).toBe(false);
  });

  it('detects overlap between an open period and a period ending later', () => {
    expect(
      accessPeriodsOverlap(
        open('2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'),
        open('2026-08-01T00:00:00.000Z'),
      ),
    ).toBe(true);
  });
});
