import type { UUID } from 'crypto';

export class UpdateTeamPermittedModelCommand {
  constructor(
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
    public readonly teamId: UUID,
    public readonly anonymousOnly: boolean,
  ) {}
}
