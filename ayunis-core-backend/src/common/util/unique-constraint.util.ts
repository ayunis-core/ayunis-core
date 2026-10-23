const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const record = error as Record<string, unknown>;
  if (record.code === PG_UNIQUE_VIOLATION) return true;

  const driverError = record.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === PG_UNIQUE_VIOLATION
  );
}
