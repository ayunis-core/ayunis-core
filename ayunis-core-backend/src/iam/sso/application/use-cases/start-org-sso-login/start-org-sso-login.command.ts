import type { UUID } from 'crypto';

export class StartOrgSsoLoginCommand {
  constructor(readonly orgId: UUID) {}
}
