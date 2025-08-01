import { UUID } from 'crypto';

export class GetPermittedEmbeddingModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
