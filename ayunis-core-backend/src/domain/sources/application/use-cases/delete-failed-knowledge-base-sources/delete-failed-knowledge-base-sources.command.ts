import type { UUID } from 'crypto';

export class DeleteFailedKnowledgeBaseSourcesCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly orgId: UUID,
  ) {}
}
