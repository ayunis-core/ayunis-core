/**
 * Allowed retention windows, in days. Retention is restricted to this
 * allowlist (rather than a free-form integer) so an admin cannot accidentally
 * configure a destructive value like "1 day". The lowest value doubles as the
 * floor. `null` is a valid, separate state meaning "disabled / keep forever".
 */
export const ALLOWED_RETENTION_DAYS = [30, 90, 180, 365, 730] as const;

export type RetentionDays = (typeof ALLOWED_RETENTION_DAYS)[number];

/**
 * A retention setting is valid when it is either `null` (disabled) or one of
 * the allowed windows. Used by both the HTTP DTO and the domain use case so
 * non-HTTP callers (e.g. seeds, scripts) are held to the same constraint.
 */
export function isValidRetentionDays(value: number | null): boolean {
  if (value === null) {
    return true;
  }
  return (ALLOWED_RETENTION_DAYS as readonly number[]).includes(value);
}
