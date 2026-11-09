import type { UUID } from 'crypto';

export class ResendExpiredInvitesCommand {
  constructor(public readonly orgId: UUID) {}
}
