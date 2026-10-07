import type { UUID } from 'crypto';

export class ReplaceModelWithUserDefaultCommand {
  orgId: UUID;
  oldPermittedModelId: UUID;
  constructor(params: { orgId: UUID; oldPermittedModelId: UUID }) {
    this.orgId = params.orgId;
    this.oldPermittedModelId = params.oldPermittedModelId;
  }
}
