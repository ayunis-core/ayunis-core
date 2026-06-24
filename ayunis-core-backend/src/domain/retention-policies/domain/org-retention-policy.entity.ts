import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface OrgRetentionPolicyParams {
  id?: UUID;
  orgId: UUID;
  retentionDays: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Org-level data-retention setting. `retentionDays === null` means retention
 * is disabled (data is kept forever) — the default for every org until an
 * admin opts in. When enabled, conversation data with no activity for longer
 * than `retentionDays` is deleted by the nightly enforcement job.
 */
export class OrgRetentionPolicy {
  id: UUID;
  orgId: UUID;
  retentionDays: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: OrgRetentionPolicyParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.retentionDays = params.retentionDays;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  isEnabled(): boolean {
    return this.retentionDays !== null;
  }

  /**
   * The activity cutoff for this policy: threads whose last activity is before
   * the returned date are expired. Returns `null` when retention is disabled.
   */
  cutoffFrom(now: Date): Date | null {
    if (this.retentionDays === null) {
      return null;
    }
    // Absolute-time arithmetic (not setDate) so the cutoff is deterministic
    // and independent of the server's timezone / DST transitions.
    const millisPerDay = 24 * 60 * 60 * 1000;
    return new Date(now.getTime() - this.retentionDays * millisPerDay);
  }
}
