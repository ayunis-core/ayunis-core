import type { UUID } from 'crypto';

export class HasOparlVectorsOfModelQuery {
  constructor(public readonly embeddingModelId: UUID) {}
}
