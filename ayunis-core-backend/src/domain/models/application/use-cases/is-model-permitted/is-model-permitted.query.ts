import { UUID } from 'crypto';

export class IsModelPermittedQuery {
  modelId: UUID;
  orgId: UUID;

  constructor(params: { modelId: UUID; orgId: UUID }) {
    this.modelId = params.modelId;
    this.orgId = params.orgId;
  }
}
