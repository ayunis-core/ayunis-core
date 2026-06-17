import type { UUID } from 'crypto';

export class CreateTeamPermittedModelCommand {
  constructor(
    public readonly modelId: UUID,
    public readonly orgId: UUID,
    public readonly teamId: UUID,
    public readonly anonymousOnly?: boolean,
  ) {}
}
