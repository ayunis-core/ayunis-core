import { getNextDate } from './get-date-for-anchor-and-cycle';
import { RenewalCycle } from '../../domain/value-objects/renewal-cycle.enum';

describe('getNextDate', () => {
  describe('monthly cycle', () => {
    it('should return the next renewal date after target date', () => {
      // Example from the user: anchor Jan 13th, target May 16th -> next Jun 13th
      const anchorDate = new Date(Date.UTC(2024, 0, 13)); // Jan 13th
      const targetDate = new Date(Date.UTC(2024, 4, 16)); // May 16th
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.MONTHLY,
      });

      expect(result).toEqual(new Date(Date.UTC(2024, 5, 13))); // Jun 13th
    });

    it('should handle same month scenario', () => {
      const anchorDate = new Date(Date.UTC(2024, 0, 13)); // Jan 13th
      const targetDate = new Date(Date.UTC(2024, 0, 20)); // Jan 20th
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.MONTHLY,
      });

      expect(result).toEqual(new Date(Date.UTC(2024, 1, 13))); // Feb 13th
    });

    it('should handle target exactly on renewal date', () => {
      const anchorDate = new Date(Date.UTC(2024, 0, 13)); // Jan 13th
      const targetDate = new Date(Date.UTC(2024, 2, 13)); // Mar 13th
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.MONTHLY,
      });

      expect(result).toEqual(new Date(Date.UTC(2024, 3, 13))); // Apr 13th
    });

    it('should handle month overflow (Jan 31 -> Feb 28)', () => {
      const anchorDate = new Date(Date.UTC(2024, 0, 31)); // Jan 31st
      const targetDate = new Date(Date.UTC(2024, 1, 15)); // Feb 15th
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.MONTHLY,
      });

      expect(result).toEqual(new Date(Date.UTC(2024, 1, 29))); // Feb 29th 2024 (leap year)
    });

    it('should handle leap year edge case (Feb 29 -> Feb 28)', () => {
      const anchorDate = new Date(Date.UTC(2024, 1, 29)); // Feb 29th leap year
      const targetDate = new Date(Date.UTC(2025, 1, 15)); // Feb 15th 2025
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.MONTHLY,
      });

      expect(result).toEqual(new Date(Date.UTC(2025, 1, 28))); // Feb 28th 2025 (non-leap year)
    });
  });

  describe('yearly cycle', () => {
    it('should return the next renewal date after target date', () => {
      const anchorDate = new Date('2022-01-13');
      const targetDate = new Date('2024-05-16');
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.YEARLY,
      });

      expect(result).toEqual(new Date('2025-01-13'));
    });

    it('should handle same year scenario', () => {
      const anchorDate = new Date('2024-01-13');
      const targetDate = new Date('2024-06-10');
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.YEARLY,
      });

      expect(result).toEqual(new Date('2025-01-13'));
    });

    it('should handle target exactly on renewal date', () => {
      const anchorDate = new Date('2024-01-13');
      const targetDate = new Date('2024-01-13');
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.YEARLY,
      });

      expect(result).toEqual(new Date('2025-01-13'));
    });

    it('should handle leap year edge case (Feb 29 -> Feb 28)', () => {
      const anchorDate = new Date(Date.UTC(2024, 1, 29)); // Feb 29th leap year
      const targetDate = new Date(Date.UTC(2025, 0, 15)); // Jan 15th 2025
      const result = getNextDate({
        anchorDate,
        targetDate,
        cycle: RenewalCycle.YEARLY,
      });

      expect(result).toEqual(new Date(Date.UTC(2025, 1, 28))); // Feb 28th 2025 (non-leap year)
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
