import { validateOptionalDateRange } from './usage.utils';
import { InvalidDateRangeError } from './usage.errors';

describe('validateOptionalDateRange', () => {
  it('should not throw when both dates are undefined', () => {
    expect(() => validateOptionalDateRange(undefined, undefined)).not.toThrow();
  });

  it('should not throw when both dates are provided and valid', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    expect(() => validateOptionalDateRange(startDate, endDate)).not.toThrow();
  });

  it('should throw when only startDate is provided', () => {
    const startDate = new Date('2024-01-01');
    expect(() => validateOptionalDateRange(startDate, undefined)).toThrow(
      InvalidDateRangeError,
    );
  });

  it('should throw when only endDate is provided', () => {
    const endDate = new Date('2024-01-31');
    expect(() => validateOptionalDateRange(undefined, endDate)).toThrow(
      InvalidDateRangeError,
    );
  });

  it('should throw when start date is after end date', () => {
    const startDate = new Date('2024-01-31');
    const endDate = new Date('2024-01-01');
    expect(() => validateOptionalDateRange(startDate, endDate)).toThrow(
      InvalidDateRangeError,
    );
  });
});
