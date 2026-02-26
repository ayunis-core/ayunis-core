import { UserUsageItem } from './user-usage-item.entity';
import { UsageConstants } from './value-objects/usage.constants';

describe('UserUsageItem', () => {
  describe('computeIsActive', () => {
    it('should return true when lastActivity is within the threshold', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      expect(UserUsageItem.computeIsActive(recentDate)).toBe(true);
    });

    it('should return false when lastActivity is older than the threshold', () => {
      const oldDate = new Date();
      oldDate.setDate(
        oldDate.getDate() - (UsageConstants.ACTIVE_USER_DAYS_THRESHOLD + 10),
      );

      expect(UserUsageItem.computeIsActive(oldDate)).toBe(false);
    });

    it('should return false when lastActivity is null', () => {
      expect(UserUsageItem.computeIsActive(null)).toBe(false);
    });

    it('should return true at the exact boundary of the threshold', () => {
      // Activity exactly at the threshold boundary should be considered active
      const boundaryDate = new Date(
        Date.now() -
          UsageConstants.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000,
      );

      expect(UserUsageItem.computeIsActive(boundaryDate)).toBe(true);
    });

    it('should return false one millisecond past the threshold', () => {
      const justPastThreshold = new Date(
        Date.now() -
          UsageConstants.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000 -
          1,
      );

      expect(UserUsageItem.computeIsActive(justPastThreshold)).toBe(false);
    });
  });

  describe('getActiveThresholdDate', () => {
    it('should return a date that is ACTIVE_USER_DAYS_THRESHOLD days in the past', () => {
      const before = Date.now();
      const thresholdDate = UserUsageItem.getActiveThresholdDate();
      const after = Date.now();

      const expectedMs =
        UsageConstants.ACTIVE_USER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;

      // The threshold date should be within the expected range
      expect(thresholdDate.getTime()).toBeGreaterThanOrEqual(
        before - expectedMs,
      );
      expect(thresholdDate.getTime()).toBeLessThanOrEqual(after - expectedMs);
    });
  });
});
