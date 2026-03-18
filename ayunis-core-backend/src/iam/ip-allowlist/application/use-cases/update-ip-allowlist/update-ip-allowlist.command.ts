import type { UUID } from 'crypto';

export class UpdateIpAllowlistCommand {
  readonly orgId: UUID;
  readonly cidrs: string[];
  readonly clientIp: string;

  constructor(orgId: UUID, cidrs: string[], clientIp: string) {
    this.orgId = orgId;
    this.cidrs = cidrs;
    this.clientIp = clientIp;
  }
}
