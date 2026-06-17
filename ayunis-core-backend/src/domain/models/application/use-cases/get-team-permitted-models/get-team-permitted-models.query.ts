import type { UUID } from 'crypto';

export class GetTeamPermittedModelsQuery {
  constructor(
    public readonly teamId: UUID,
    public readonly orgId: UUID,
  ) {}
}
