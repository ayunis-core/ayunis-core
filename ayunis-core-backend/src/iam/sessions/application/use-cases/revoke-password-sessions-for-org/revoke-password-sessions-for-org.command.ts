import type { UUID } from 'crypto';

export class RevokePasswordSessionsForOrgCommand {
  constructor(public readonly orgId: UUID) {}
}
