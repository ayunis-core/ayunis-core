import type { UUID } from 'crypto';

export class ReplaceModelWithUserDefaultCommand {
  orgId: UUID;
  oldPermittedModelId?: UUID;
  oldAgentId?: UUID;
  constructor(params: {
    orgId: UUID;
    oldPermittedModelId?: UUID;
    oldAgentId?: UUID;
  }) {
    this.orgId = params.orgId;
    this.oldPermittedModelId = params.oldPermittedModelId;
    this.oldAgentId = params.oldAgentId;
  }
}
