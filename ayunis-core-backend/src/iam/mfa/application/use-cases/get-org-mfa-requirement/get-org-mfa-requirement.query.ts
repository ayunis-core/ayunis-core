import type { UUID } from 'crypto';

export class GetOrgMfaRequirementQuery {
  constructor(public readonly orgId: UUID) {}
}
