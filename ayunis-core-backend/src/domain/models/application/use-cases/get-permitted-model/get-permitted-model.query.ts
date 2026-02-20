import type { UUID } from 'crypto';

export class GetPermittedModelQuery {
  orgId: UUID;
  permittedModelId: UUID;
  constructor(params: { orgId: UUID; permittedModelId: UUID }) {
    this.orgId = params.orgId;
    this.permittedModelId = params.permittedModelId;
  }
}
