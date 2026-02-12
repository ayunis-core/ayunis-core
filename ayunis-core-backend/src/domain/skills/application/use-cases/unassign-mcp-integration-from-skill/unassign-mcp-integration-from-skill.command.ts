import { UUID } from 'crypto';

export class UnassignMcpIntegrationFromSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly integrationId: UUID,
  ) {}
}
