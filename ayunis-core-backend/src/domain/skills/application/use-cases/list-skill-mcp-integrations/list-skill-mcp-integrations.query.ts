import { UUID } from 'crypto';

export class ListSkillMcpIntegrationsQuery {
  constructor(public readonly skillId: UUID) {}
}
