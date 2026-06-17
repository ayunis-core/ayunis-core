import type { UUID } from 'crypto';

export class ReplaceModelWithUserDefaultCommand {
  orgId: UUID;
  oldPermittedModelId: UUID;
  catalogModelId?: UUID;
  constructor(params: {
    orgId: UUID;
    oldPermittedModelId: UUID;
    catalogModelId?: UUID;
  }) {
    this.orgId = params.orgId;
    this.oldPermittedModelId = params.oldPermittedModelId;
    this.catalogModelId = params.catalogModelId;
  }
}
