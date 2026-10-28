import { getNextDate } from './get-date-for-anchor-and-cycle';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';

describe('getNextDate', () => {
  describe('monthly cycle', () => {
    it.each([
      {
        name: 'return the next renewal date after target date',
        anchorDate: new Date(Date.UTC(2024, 0, 13)), // Jan 13th
        targetDate: new Date(Date.UTC(2024, 4, 16)), // May 16th
        expected: new Date(Date.UTC(2024, 5, 13)), // Jun 13th
      },
      {
        name: 'handle same month scenario',
        anchorDate: new Date(Date.UTC(2024, 0, 13)), // Jan 13th
        targetDate: new Date(Date.UTC(2024, 0, 20)), // Jan 20th
        expected: new Date(Date.UTC(2024, 1, 13)), // Feb 13th
      },
      {
        name: 'handle target exactly on renewal date',
        anchorDate: new Date(Date.UTC(2024, 0, 13)), // Jan 13th
        targetDate: new Date(Date.UTC(2024, 2, 13)), // Mar 13th
        expected: new Date(Date.UTC(2024, 3, 13)), // Apr 13th
      },
      {
        name: 'handle month overflow (Jan 31 -> Feb 28)',
        anchorDate: new Date(Date.UTC(2024, 0, 31)), // Jan 31st
        targetDate: new Date(Date.UTC(2024, 1, 15)), // Feb 15th
        expected: new Date(Date.UTC(2024, 1, 29)), // Feb 29th 2024 (leap year)
      },
      {
        name: 'handle leap year edge case (Feb 29 -> Feb 28)',
        anchorDate: new Date(Date.UTC(2024, 1, 29)), // Feb 29th leap year
        targetDate: new Date(Date.UTC(2025, 1, 15)), // Feb 15th 2025
        expected: new Date(Date.UTC(2025, 1, 28)), // Feb 28th 2025 (non-leap year)
      },
    ])('should $name', ({ anchorDate, targetDate, expected }) => {
      expect(
        getNextDate({ anchorDate, targetDate, cycle: RenewalCycle.MONTHLY }),
      ).toEqual(expected);
    });
  });

  describe('yearly cycle', () => {
    it.each([
      {
        name: 'return the next renewal date after target date',
        anchorDate: new Date('2022-01-13'),
        targetDate: new Date('2024-05-16'),
        expected: new Date('2025-01-13'),
      },
      {
        name: 'handle same year scenario',
        anchorDate: new Date('2024-01-13'),
        targetDate: new Date('2024-06-10'),
        expected: new Date('2025-01-13'),
      },
      {
        name: 'handle target exactly on renewal date',
        anchorDate: new Date('2024-01-13'),
        targetDate: new Date('2024-01-13'),
        expected: new Date('2025-01-13'),
      },
      {
        name: 'handle leap year edge case (Feb 29 -> Feb 28)',
        anchorDate: new Date(Date.UTC(2024, 1, 29)), // Feb 29th leap year
        targetDate: new Date(Date.UTC(2025, 0, 15)), // Jan 15th 2025
        expected: new Date(Date.UTC(2025, 1, 28)), // Feb 28th 2025 (non-leap year)
      },
    ])('should $name', ({ anchorDate, targetDate, expected }) => {
      expect(
        getNextDate({ anchorDate, targetDate, cycle: RenewalCycle.YEARLY }),
      ).toEqual(expected);
    });
  });

  describe('error handling', () => {
    it('should throw error when anchor date is after target date', () => {
      const anchorDate = new Date('2024-05-16');
      const targetDate = new Date('2024-01-13');

      expect(() => {
        getNextDate({
          anchorDate,
          targetDate,
          cycle: RenewalCycle.MONTHLY,
        });
      }).toThrow('Anchor date cannot be after target date');
    });
  });
});
