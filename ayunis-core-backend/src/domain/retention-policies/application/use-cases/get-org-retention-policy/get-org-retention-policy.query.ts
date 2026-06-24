import type { UUID } from 'crypto';

export class GetOrgRetentionPolicyQuery {
  constructor(public readonly orgId: UUID) {}
}
