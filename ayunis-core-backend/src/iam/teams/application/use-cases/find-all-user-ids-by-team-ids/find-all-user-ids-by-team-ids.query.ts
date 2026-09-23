import type { UUID } from 'crypto';

export class FindAllUserIdsByTeamIdsQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly teamIds: UUID[],
  ) {}
}
