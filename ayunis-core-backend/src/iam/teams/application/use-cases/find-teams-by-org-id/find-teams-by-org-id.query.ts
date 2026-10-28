import type { UUID } from 'crypto';

export class FindTeamsByOrgIdQuery {
  constructor(public readonly orgId: UUID) {}
}
