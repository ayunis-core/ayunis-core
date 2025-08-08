import { UUID } from 'crypto';

export class IsEmbeddingModelEnabledQuery {
  constructor(public readonly orgId: UUID) {}
}
