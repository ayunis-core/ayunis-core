import type { UUID } from 'crypto';

export class ReplaceModelWithUserDefaultCommand {
  orgId: UUID;
  oldPermittedModelId?: UUID;
  catalogModelId?: UUID;
  oldAgentId?: UUID;
  constructor(params: {
    orgId: UUID;
    oldPermittedModelId?: UUID;
    catalogModelId?: UUID;
    oldAgentId?: UUID;
  }) {
    this.orgId = params.orgId;
    this.oldPermittedModelId = params.oldPermittedModelId;
    this.catalogModelId = params.catalogModelId;
    this.oldAgentId = params.oldAgentId;
  }
}
