/**
 * What the academy tells other modules about a completion: the pass date with
 * the validity period already applied, so no consumer has to know the period.
 */
export interface AcademyCompletionView {
  readonly completedAt: Date | null;
  readonly expiresAt: Date | null;
}
