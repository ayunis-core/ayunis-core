import type { UUID } from 'crypto';

export class GetTeamPermittedImageGenerationModelsQuery {
  constructor(
    public readonly teamId: UUID,
    public readonly orgId: UUID,
  ) {}
}
