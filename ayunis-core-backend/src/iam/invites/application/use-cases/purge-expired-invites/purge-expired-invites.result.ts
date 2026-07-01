export interface PurgeExpiredInvitesResult {
  /** Number of expired invites deleted (always 0 in dry-run mode). */
  deletedCount: number;
  /**
   * Number of expired invites matched by the purge. Equal to `deletedCount`
   * outside dry-run mode; in dry-run it reports what *would* be deleted.
   */
  matchedCount: number;
  /** Invites with `expiresAt` strictly before this instant were purged. */
  cutoff: Date;
  /** Grace period (in days) applied after expiry before purging. */
  graceDays: number;
  /** When true, nothing was deleted — the run only reported the impact. */
  dryRun: boolean;
}
