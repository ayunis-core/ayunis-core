import type { UUID } from 'crypto';

export class DeleteIpAllowlistCommand {
  readonly orgId: UUID;

  constructor(orgId: UUID) {
    this.orgId = orgId;
  }
}
