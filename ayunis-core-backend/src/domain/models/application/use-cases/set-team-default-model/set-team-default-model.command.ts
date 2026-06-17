import type { UUID } from 'crypto';

export class SetTeamDefaultModelCommand {
  constructor(
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
    public readonly teamId: UUID,
  ) {}
}
