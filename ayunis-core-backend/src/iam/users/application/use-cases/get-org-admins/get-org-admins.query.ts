import type { UUID } from 'crypto';

export class GetOrgAdminsQuery {
  constructor(public readonly orgId: UUID) {}
}
