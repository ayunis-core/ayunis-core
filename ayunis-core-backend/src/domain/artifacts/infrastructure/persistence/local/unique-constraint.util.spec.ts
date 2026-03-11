import { isUniqueConstraintViolation } from './unique-constraint.util';

describe('isUniqueConstraintViolation', () => {
  it('should return true for TypeORM QueryFailedError with PG code 23505', () => {
    const error = Object.assign(new Error('duplicate key value'), {
      driverError: { code: '23505' },
    });

    expect(isUniqueConstraintViolation(error)).toBe(true);
  });

  it('should return true for raw PG error with code 23505', () => {
    const error = Object.assign(new Error('unique_violation'), {
      code: '23505',
    });

    expect(isUniqueConstraintViolation(error)).toBe(true);
  });

  it('should return false for a generic Error without PG code', () => {
    expect(isUniqueConstraintViolation(new Error('Connection refused'))).toBe(
      false,
    );
  });

  it('should return false for null or undefined', () => {
    expect(isUniqueConstraintViolation(null)).toBe(false);
    expect(isUniqueConstraintViolation(undefined)).toBe(false);
  });

  it('should return false for a different PG error code', () => {
    const error = Object.assign(new Error('foreign key violation'), {
      driverError: { code: '23503' },
    });

    expect(isUniqueConstraintViolation(error)).toBe(false);
  });
});
