import type { UUID } from 'crypto';

export class FindAllThreadsByOrgWithSourcesQuery {
  constructor(public readonly orgId: UUID) {}
}
