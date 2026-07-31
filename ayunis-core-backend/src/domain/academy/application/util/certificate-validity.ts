/**
 * How long a KI-Führerschein completion stays valid. Orgs that require annual
 * recertification gate on this window; orgs that require the certificate only
 * once ignore it.
 *
 * The academy owns this period so no other module has to import it across a
 * module boundary — consumers read `expiresAt` off `GetAcademyCompletionUseCase`.
 */
export const CERTIFICATE_VALIDITY_MONTHS = 12;

/**
 * `completedAt` shifted forward by the validity period, clamping to the last
 * day of the target month so 29 Feb + 12 months lands on 28 Feb rather than
 * rolling over into March.
 */
export function certificateExpiresAt(completedAt: Date): Date {
  const expiresAt = new Date(completedAt.getTime());
  const dayOfMonth = expiresAt.getUTCDate();
  expiresAt.setUTCDate(1);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + CERTIFICATE_VALIDITY_MONTHS);
  expiresAt.setUTCDate(Math.min(dayOfMonth, daysInMonthOf(expiresAt)));
  return expiresAt;
}

/**
 * Whether a chapter pass still counts toward earning a completion. Renewal
 * requires re-passing the whole academy: a pass that has itself aged out of the
 * validity window no longer contributes, so a lapsed user cannot refresh their
 * certificate by re-taking a single chapter's quiz.
 */
export function isPassWithinValidity(passedAt: Date, now: Date): boolean {
  return certificateExpiresAt(passedAt).getTime() > now.getTime();
}

function daysInMonthOf(date: Date): number {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}
