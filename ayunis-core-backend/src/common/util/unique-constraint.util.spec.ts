import { isUniqueConstraintViolation } from 'src/common/util/unique-constraint.util';

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

describe('Postgres unique violation error shapes', () => {
  it.each([
    { code: '23505', driverError: {} },
    { code: '23505', driverError: { code: '23503' } },
    { driverError: { code: '23505' } },
  ])('recognizes a unique code on either error level: %p', (error) => {
    expect(isUniqueConstraintViolation(error)).toBe(true);
  });

  it.each([
    false,
    23505,
    '23505',
    {},
    { driverError: '23505' },
    { code: '23503' },
    { driverError: { code: 23505 } },
  ])('rejects malformed or unrelated errors: %p', (error) => {
    expect(isUniqueConstraintViolation(error)).toBe(false);
  });
});
