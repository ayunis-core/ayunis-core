import { UUID } from 'crypto';

export class GetPermittedEmbeddingModelQuery {
  id: UUID;
  orgId: UUID;

  constructor(params: { id: UUID; orgId: UUID }) {
    this.id = params.id;
    this.orgId = params.orgId;
  }
}
