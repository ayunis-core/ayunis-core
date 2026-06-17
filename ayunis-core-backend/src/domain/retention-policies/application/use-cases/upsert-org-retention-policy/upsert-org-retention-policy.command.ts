import type { UUID } from 'crypto';

export class UpsertOrgRetentionPolicyCommand {
  constructor(
    public readonly orgId: UUID,
    /** Days of inactivity before deletion, or null to disable retention. */
    public readonly retentionDays: number | null,
  ) {}
}
