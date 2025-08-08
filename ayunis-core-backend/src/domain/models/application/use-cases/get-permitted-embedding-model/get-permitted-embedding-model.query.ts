import { UUID } from 'crypto';

export class GetPermittedEmbeddingModelQuery {
  orgId: UUID;

  constructor(params: { orgId: UUID }) {
    this.orgId = params.orgId;
  }
}
