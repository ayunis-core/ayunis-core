/**
 * How long a KI-Schulung nach EU AI Act completion stays valid. Orgs that
 * require annual renewal gate on this window; orgs that require Academy completion
 * only once ignore it.
 *
 * The academy owns this period so no other module has to import it across a
 * module boundary — consumers read the already-applied `expiresAt` off
 * `AcademyCompletionView`.
 */
export const ACADEMY_COMPLETION_VALIDITY_MONTHS = 12;

/**
 * `completedAt` shifted forward by the validity period, clamping to the last
 * day of the target month so 29 Feb + 12 months lands on 28 Feb rather than
 * rolling over into March.
 */
export function certificateExpiresAt(completedAt: Date): Date {
  const expiresAt = new Date(completedAt.getTime());
  const dayOfMonth = expiresAt.getUTCDate();
  expiresAt.setUTCDate(1);
  expiresAt.setUTCMonth(
    expiresAt.getUTCMonth() + ACADEMY_COMPLETION_VALIDITY_MONTHS,
  );
  expiresAt.setUTCDate(Math.min(dayOfMonth, daysInMonthOf(expiresAt)));
  return expiresAt;
}

/**
 * Whether a chapter confirmation still counts toward earning a completion.
 * Renewal requires reconfirming the whole academy; an aged-out confirmation no
 * longer contributes to a fresh completion.
 */
export function isConfirmationWithinValidity(
  confirmedAt: Date,
  now: Date,
): boolean {
  return certificateExpiresAt(confirmedAt).getTime() > now.getTime();
}

function daysInMonthOf(date: Date): number {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}
