const PG_UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  const driverError = record.driverError as Record<string, unknown> | undefined;
  return (driverError?.code ?? record.code) === PG_UNIQUE_VIOLATION;
}
