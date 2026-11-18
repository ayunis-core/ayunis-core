import type { UUID } from 'crypto';

export class HasIndexedSourceInOrgsQuery {
  constructor(
    public readonly embeddingModelId: UUID,
    public readonly orgIds: UUID[],
  ) {}
}
