import type { UUID } from 'crypto';

export class DeleteKnowledgeBaseCommand {
  public readonly knowledgeBaseId: UUID;

  constructor(params: { knowledgeBaseId: UUID }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
  }
}
