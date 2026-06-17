import type { UUID } from 'crypto';

/** Per-org outcome of a retention enforcement run. */
export interface OrgRetentionResult {
  orgId: UUID;
  retentionDays: number;
  /** Expired threads encountered (deleted + failed, or "would delete" in dry run). */
  scanned: number;
  deleted: number;
  failed: number;
  dryRun: boolean;
  /**
   * True when enforcement stopped at the per-org batch cap before exhausting
   * the org's expired threads — expired data likely remains and the org needs
   * another run. False means the org was fully drained this run.
   */
  capReached: boolean;
}

export interface EnforceRetentionResult {
  orgsProcessed: number;
  totalDeleted: number;
  totalFailed: number;
  dryRun: boolean;
  perOrg: OrgRetentionResult[];
}
