import type { UUID } from 'crypto';

export class PurgeOrgStorageCommand {
  constructor(public readonly orgId: UUID) {}
}
