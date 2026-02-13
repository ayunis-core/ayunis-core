import { UUID } from 'crypto';

export class AssignMcpIntegrationToSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly integrationId: UUID,
  ) {}
}
