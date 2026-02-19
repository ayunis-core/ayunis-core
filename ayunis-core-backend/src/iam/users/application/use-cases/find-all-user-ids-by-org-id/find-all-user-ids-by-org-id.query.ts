import type { UUID } from 'crypto';

export class FindAllUserIdsByOrgIdQuery {
  constructor(public readonly orgId: UUID) {}
}
