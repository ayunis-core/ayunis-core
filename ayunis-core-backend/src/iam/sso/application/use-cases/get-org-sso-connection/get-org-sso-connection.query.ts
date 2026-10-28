import type { UUID } from 'crypto';

export class GetOrgSsoConnectionQuery {
  constructor(public readonly orgId: UUID) {}
}
