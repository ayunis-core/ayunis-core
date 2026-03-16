import type { UUID } from 'crypto';

export class GetIpAllowlistQuery {
  readonly orgId: UUID;

  constructor(orgId: UUID) {
    this.orgId = orgId;
  }
}
