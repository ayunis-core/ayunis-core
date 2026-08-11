/**
 * Checks if an error is a PostgreSQL foreign key violation (error code 23503).
 * Works with TypeORM's QueryFailedError which wraps the driver error.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  if (error === null || error === undefined || typeof error !== 'object') {
    return false;
  }

  const record = error as Record<string, unknown>;

  // TypeORM QueryFailedError exposes driverError with the PG error code
  if (record.driverError && typeof record.driverError === 'object') {
    const driverError = record.driverError as Record<string, unknown>;
    return driverError.code === '23503';
  }

  // Fallback: check the error itself (e.g. raw pg errors)
  return record.code === '23503';
}
