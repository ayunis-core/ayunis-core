import type { UUID } from 'crypto';

export class DeleteKnowledgeBaseCommand {
  public readonly knowledgeBaseId: UUID;
  public readonly userId: UUID;

  constructor(params: { knowledgeBaseId: UUID; userId: UUID }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.userId = params.userId;
  }
}
