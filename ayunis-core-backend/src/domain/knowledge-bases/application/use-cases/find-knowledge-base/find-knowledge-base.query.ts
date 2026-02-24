import type { UUID } from 'crypto';

export class FindKnowledgeBaseQuery {
  constructor(
    public readonly id: UUID,
    public readonly userId: UUID,
  ) {}
}
